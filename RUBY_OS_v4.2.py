#!/usr/bin/env python3
"""Ruby OS simulation runner.

A self-contained Tkinter simulation inspired by the uploaded Ruby OS files.
It models a telemetry stack with four adjustable inputs and live outputs:
- polarization error
- thermal dissipation
- bus contact resistance
- cryogenic temperature

The interface reports derived system health, a simulated lock state, and a
visual ring map. It also includes an optional auto-run mode that introduces
small drifting changes so you can watch the simulation respond over time.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
import tkinter as tk
from dataclasses import dataclass
from tkinter import ttk
from typing import Dict, List, Tuple

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
POLAR_TARGET_MAX_DEG = 0.60
THERMAL_MAX_WCM2 = 15.0
POGO_MAX_MOHM = 15.0
CRYO_MAX_K = 41.5
YIELD_MIN_PCT = 90.0
ISOLATION_MIN_DB = 35.0

NOMINAL_FORWARD_YIELD = 94.20
BASE_LEAK_DB = -38.40


class Colors:
    BG = "#0a0e14"
    SURFACE = "#111820"
    CARD = "#161d27"
    ELEVATED = "#1c2530"
    BORDER = "#2a3544"
    BORDER_SOFT = "#1f2a38"
    ACCENT = "#3d8bfd"
    ACCENT_DIM = "#2563b8"
    GREEN = "#22c55e"
    GREEN_DIM = "#16a34a"
    RED = "#ef4444"
    RED_DIM = "#dc2626"
    YELLOW = "#eab308"
    TEXT = "#c9d1d9"
    TEXT_BRIGHT = "#f0f4f8"
    MUTED = "#7d8a99"
    MUTED_2 = "#5a6775"


@dataclass
class Telemetry:
    forward_yield: float
    isolation_db: float
    blockers: List[str]
    status_colors: Dict[str, str]
    system_ok: bool
    block_hash: str


class RubyOSSimulation(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Ruby OS Simulation Runner")
        self.geometry("1240x820")
        self.minsize(1020, 700)
        self.configure(bg=Colors.BG)

        self.polarization_error = tk.DoubleVar(value=0.0)
        self.thermal_dissipation = tk.DoubleVar(value=12.5)
        self.pogo_resistance = tk.DoubleVar(value=8.31)
        self.cryo_temp = tk.DoubleVar(value=40.0)
        self.auto_run = tk.BooleanVar(value=False)

        self._val_labels: Dict[str, Tuple[tk.Label, str]] = {}
        self._status_dot: tk.Canvas | None = None
        self._status_text: tk.Label | None = None
        self._after_id: str | None = None
        self._phase = 0.0

        self._setup_styles()
        self._build_ui()
        self._bind_events()
        self.update_simulation()

    # ------------------------------------------------------------------
    # UI setup
    # ------------------------------------------------------------------
    def _setup_styles(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")

        style.configure(
            ".",
            background=Colors.CARD,
            foreground=Colors.TEXT,
            font=("Segoe UI", 10),
        )
        style.configure("TFrame", background=Colors.CARD)
        style.configure("TLabel", background=Colors.CARD, foreground=Colors.TEXT)
        style.configure(
            "Ruby.Horizontal.TScale",
            background=Colors.CARD,
            troughcolor=Colors.ELEVATED,
            bordercolor=Colors.BORDER,
            lightcolor=Colors.ACCENT,
            darkcolor=Colors.ACCENT_DIM,
            sliderthickness=18,
        )
        style.map("Ruby.Horizontal.TScale", background=[("active", Colors.ACCENT)])
        style.configure(
            "Accent.TButton",
            background=Colors.ACCENT,
            foreground=Colors.BG,
            font=("Segoe UI", 10, "bold"),
            padding=(14, 7),
            borderwidth=0,
        )
        style.map(
            "Accent.TButton",
            background=[("active", "#5ba0ff"), ("pressed", Colors.ACCENT_DIM)],
        )
        style.configure(
            "Ghost.TButton",
            background=Colors.ELEVATED,
            foreground=Colors.TEXT,
            font=("Segoe UI", 10),
            padding=(12, 6),
            borderwidth=0,
        )
        style.map("Ghost.TButton", background=[("active", Colors.BORDER)])

    def _build_ui(self) -> None:
        header = tk.Frame(self, bg=Colors.SURFACE, height=64)
        header.pack(fill="x", side="top")
        header.pack_propagate(False)

        brand = tk.Frame(header, bg=Colors.SURFACE)
        brand.pack(side="left", padx=20, pady=12)

        tk.Label(
            brand,
            text="RUBY OS",
            font=("Courier New", 16, "bold"),
            fg=Colors.ACCENT,
            bg=Colors.SURFACE,
        ).pack(side="left")

        tk.Label(
            brand,
            text="  simulation",
            font=("Segoe UI", 11),
            fg=Colors.MUTED,
            bg=Colors.SURFACE,
        ).pack(side="left", pady=(2, 0))

        status_cluster = tk.Frame(header, bg=Colors.SURFACE)
        status_cluster.pack(side="right", padx=20)

        self._status_dot = tk.Canvas(
            status_cluster, width=14, height=14, bg=Colors.SURFACE, highlightthickness=0
        )
        self._status_dot.pack(side="left", padx=(0, 8))
        self._status_dot.create_oval(2, 2, 12, 12, fill=Colors.GREEN, outline="")

        self._status_text = tk.Label(
            status_cluster,
            text="SYSTEM NOMINAL",
            font=("Segoe UI", 10, "bold"),
            fg=Colors.GREEN,
            bg=Colors.SURFACE,
        )
        self._status_text.pack(side="left")

        tk.Frame(self, bg=Colors.BORDER_SOFT, height=1).pack(fill="x")

        main = tk.Frame(self, bg=Colors.BG)
        main.pack(fill="both", expand=True, padx=16, pady=16)

        left = tk.Frame(main, bg=Colors.BG, width=380)
        left.pack(side="left", fill="y", padx=(0, 12))
        left.pack_propagate(False)

        ctrl_card = self._card(left, "PHYSICAL TELEMETRY")
        ctrl_card.pack(fill="both", expand=True)

        self._slider(
            ctrl_card,
            "Polarization Angle Error",
            self.polarization_error,
            -5.0,
            5.0,
            "°",
            f"Target ±{POLAR_TARGET_MAX_DEG:.2f}°  ·  Malus yield control",
        )
        self._slider(
            ctrl_card,
            "Micro-Heater Dissipation",
            self.thermal_dissipation,
            0.0,
            25.0,
            "W/cm²",
            f"Ceiling ≤ {THERMAL_MAX_WCM2:.1f} W/cm²",
        )
        self._slider(
            ctrl_card,
            "Bus Contact Resistance",
            self.pogo_resistance,
            0.0,
            30.0,
            "mΩ",
            f"Ceiling ≤ {POGO_MAX_MOHM:.1f} mΩ  ·  Au pogo array",
        )
        self._slider(
            ctrl_card,
            "Stirling Cold-Finger",
            self.cryo_temp,
            30.0,
            60.0,
            "K",
            f"NbN limit ≤ {CRYO_MAX_K:.1f} K",
        )

        actions = tk.Frame(ctrl_card, bg=Colors.CARD)
        actions.pack(fill="x", pady=(18, 4), padx=4)

        ttk.Button(
            actions, text="Reset Nominal", command=self._reset_defaults, style="Accent.TButton"
        ).pack(side="left", padx=(0, 8))
        ttk.Button(
            actions, text="Re-Evaluate", command=self.update_simulation, style="Ghost.TButton"
        ).pack(side="left", padx=(0, 8))
        ttk.Button(
            actions, text="Start/Stop Run", command=self._toggle_auto_run, style="Ghost.TButton"
        ).pack(side="left")

        toggle_row = tk.Frame(ctrl_card, bg=Colors.CARD)
        toggle_row.pack(fill="x", pady=(12, 4), padx=4)
        tk.Checkbutton(
            toggle_row,
            text="Auto-drift simulation",
            variable=self.auto_run,
            command=self._toggle_auto_run,
            bg=Colors.CARD,
            fg=Colors.TEXT,
            activebackground=Colors.CARD,
            activeforeground=Colors.TEXT_BRIGHT,
            selectcolor=Colors.ELEVATED,
            relief="flat",
            highlightthickness=0,
        ).pack(anchor="w")

        self._status_box = tk.LabelFrame(
            ctrl_card,
            text=" LIVE RESULT ",
            bg=Colors.CARD,
            fg=Colors.ACCENT,
            font=("Segoe UI", 10, "bold"),
            bd=1,
            relief="solid",
            padx=10,
            pady=10,
        )
        self._status_box.pack(fill="x", pady=(12, 0), padx=4)
        self._result_label = tk.Label(
            self._status_box,
            text="",
            justify="left",
            anchor="w",
            bg=Colors.CARD,
            fg=Colors.TEXT_BRIGHT,
            font=("Segoe UI", 9),
        )
        self._result_label.pack(fill="x")

        right = tk.Frame(main, bg=Colors.BG)
        right.pack(side="right", fill="both", expand=True)

        map_card = self._card(right, "FACILITY COMPLEX 5000  ·  SPATIAL MAP")
        map_card.pack(fill="both", expand=True, pady=(0, 12))

        self.canvas = tk.Canvas(map_card, bg=Colors.BG, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True, padx=2, pady=2)

        console_card = self._card(right, "RUBY OS DIALECT  ·  CONSOLE")
        console_card.pack(fill="x")

        self.console = tk.Text(
            console_card,
            bg=Colors.BG,
            fg=Colors.ACCENT,
            font=("Courier New", 10),
            height=7,
            wrap="word",
            bd=0,
            highlightthickness=0,
            padx=10,
            pady=8,
            insertbackground=Colors.ACCENT,
        )
        self.console.pack(fill="both", expand=True)

    def _card(self, parent: tk.Widget, title: str) -> tk.Frame:
        outer = tk.Frame(parent, bg=Colors.BORDER_SOFT, padx=1, pady=1)
        inner = tk.Frame(outer, bg=Colors.CARD)
        inner.pack(fill="both", expand=True)

        title_bar = tk.Frame(inner, bg=Colors.ELEVATED, height=32)
        title_bar.pack(fill="x")
        title_bar.pack_propagate(False)

        tk.Label(
            title_bar,
            text=title,
            font=("Segoe UI", 9, "bold"),
            fg=Colors.MUTED,
            bg=Colors.ELEVATED,
            anchor="w",
        ).pack(side="left", padx=12, pady=6)

        content = tk.Frame(inner, bg=Colors.CARD)
        content.pack(fill="both", expand=True, padx=12, pady=10)
        outer.content = content  # type: ignore[attr-defined]
        return outer

    def _slider(
        self,
        card: tk.Frame,
        label: str,
        variable: tk.DoubleVar,
        min_v: float,
        max_v: float,
        unit: str,
        hint: str,
    ) -> None:
        parent = card.content  # type: ignore[attr-defined]

        row = tk.Frame(parent, bg=Colors.CARD)
        row.pack(fill="x", pady=(0, 14))

        top = tk.Frame(row, bg=Colors.CARD)
        top.pack(fill="x")

        tk.Label(
            top,
            text=label,
            font=("Segoe UI", 10, "bold"),
            fg=Colors.TEXT_BRIGHT,
            bg=Colors.CARD,
        ).pack(side="left")

        val_lbl = tk.Label(
            top,
            text="",
            font=("Courier New", 11, "bold"),
            fg=Colors.ACCENT,
            bg=Colors.CARD,
        )
        val_lbl.pack(side="right")
        self._val_labels[label] = (val_lbl, unit)

        scale = ttk.Scale(
            row,
            from_=min_v,
            to=max_v,
            variable=variable,
            orient="horizontal",
            style="Ruby.Horizontal.TScale",
            command=lambda _: self.update_simulation(),
        )
        scale.pack(fill="x", pady=(4, 2))

        tk.Label(
            row,
            text=hint,
            font=("Segoe UI", 8),
            fg=Colors.MUTED_2,
            bg=Colors.CARD,
        ).pack(anchor="w")

    # ------------------------------------------------------------------
    # Events and controls
    # ------------------------------------------------------------------
    def _bind_events(self) -> None:
        self.canvas.bind("<Configure>", lambda e: self.update_simulation())

    def _reset_defaults(self) -> None:
        self.polarization_error.set(0.0)
        self.thermal_dissipation.set(12.5)
        self.pogo_resistance.set(8.31)
        self.cryo_temp.set(40.0)
        self.update_simulation()

    def _toggle_auto_run(self) -> None:
        if self.auto_run.get():
            self._schedule_auto_run()
        else:
            if self._after_id is not None:
                self.after_cancel(self._after_id)
                self._after_id = None

    def _schedule_auto_run(self) -> None:
        if self._after_id is not None:
            self.after_cancel(self._after_id)
        self._step_auto_run()
        self._after_id = self.after(120, self._schedule_auto_run)

    def _step_auto_run(self) -> None:
        self._phase += 0.08
        self.polarization_error.set(0.9 * math.sin(self._phase * 0.75))
        self.thermal_dissipation.set(12.5 + 6.0 * (0.5 + 0.5 * math.sin(self._phase * 1.3)))
        self.pogo_resistance.set(8.31 + 6.5 * (0.5 + 0.5 * math.sin(self._phase * 0.97 + 1.5)))
        self.cryo_temp.set(39.8 + 2.8 * (0.5 + 0.5 * math.sin(self._phase * 0.61 + 0.4)))
        self.update_simulation()

    # ------------------------------------------------------------------
    # Physics model
    # ------------------------------------------------------------------
    def _compute_physics(self) -> Telemetry:
        angle_err = self.polarization_error.get()
        thermal = self.thermal_dissipation.get()
        resistance = self.pogo_resistance.get()
        cryo = self.cryo_temp.get()

        angle_rad = math.radians(angle_err)
        forward_yield = NOMINAL_FORWARD_YIELD * (math.cos(angle_rad) ** 2)

        base_leak = 10.0 ** (BASE_LEAK_DB / 10.0)
        polar_leak = math.sin(2.0 * angle_rad) ** 2
        total_leak = max(base_leak + polar_leak, 1e-20)
        isolation_db = -10.0 * math.log10(total_leak)

        blockers: List[str] = []
        colors = {k: Colors.GREEN for k in ("R1", "R2", "R3", "R4", "R5")}

        if thermal > THERMAL_MAX_WCM2:
            blockers.append(
                f"THERMAL OVERFLOW — {thermal:.2f} W/cm² exceeds {THERMAL_MAX_WCM2:.1f} ceiling"
            )
            colors["R2"] = Colors.RED
        if cryo > CRYO_MAX_K:
            blockers.append(
                f"CRYOGENIC QUENCH — {cryo:.2f} K exceeds NbN limit {CRYO_MAX_K:.1f} K"
            )
            colors["R4"] = Colors.RED
        if forward_yield < YIELD_MIN_PCT:
            blockers.append(
                f"YIELD DEFICIT — waveguide at {forward_yield:.2f}% (min {YIELD_MIN_PCT:.0f}%)"
            )
            colors["R3"] = Colors.RED
        if isolation_db < ISOLATION_MIN_DB:
            blockers.append(
                f"ISOLATION DEFICIT — {isolation_db:.2f} dB (min {ISOLATION_MIN_DB:.0f} dB)"
            )
            colors["R3"] = Colors.RED
        if resistance > POGO_MAX_MOHM:
            blockers.append(
                f"INTERFACE RESISTANCE — {resistance:.2f} mΩ exceeds {POGO_MAX_MOHM:.1f} mΩ"
            )
            colors["R5"] = Colors.RED

        if blockers:
            colors["R1"] = Colors.RED

        system_ok = len(blockers) == 0
        payload = {
            "polarization_angle_error_deg": round(angle_err, 4),
            "measured_yield_pct": round(forward_yield, 3),
            "measured_isolation_db": round(isolation_db, 3),
            "expected_thermal_dissipation_W_cm2": round(thermal, 3),
            "measured_resistance_mohm": round(resistance, 3),
            "measured_stirling_temp_k": round(cryo, 3),
            "ok": system_ok,
        }
        block_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()

        return Telemetry(
            forward_yield=forward_yield,
            isolation_db=isolation_db,
            blockers=blockers,
            status_colors=colors,
            system_ok=system_ok,
            block_hash=block_hash,
        )

    # ------------------------------------------------------------------
    # Simulation update
    # ------------------------------------------------------------------
    def update_simulation(self) -> None:
        angle = self.polarization_error.get()
        thermal = self.thermal_dissipation.get()
        resistance = self.pogo_resistance.get()
        cryo = self.cryo_temp.get()

        mapping = {
            "Polarization Angle Error": (angle, "+.3f"),
            "Micro-Heater Dissipation": (thermal, ".2f"),
            "Bus Contact Resistance": (resistance, ".2f"),
            "Stirling Cold-Finger": (cryo, ".2f"),
        }
        for key, (val, fmt) in mapping.items():
            lbl, unit = self._val_labels[key]
            lbl.configure(text=f"{val:{fmt}} {unit}")

        t = self._compute_physics()

        if self._status_dot and self._status_text:
            self._status_dot.delete("all")
            color = Colors.GREEN if t.system_ok else Colors.RED
            self._status_dot.create_oval(2, 2, 12, 12, fill=color, outline="")
            self._status_text.configure(
                text="SYSTEM NOMINAL" if t.system_ok else "SYSTEM BLOCKED",
                fg=color,
            )

        self._draw_map(t.status_colors, t.forward_yield, t.isolation_db)
        self._render_console(t)
        self._render_result(t)

    def _render_result(self, t: Telemetry) -> None:
        if t.system_ok:
            text = (
                f"OK — launch-ready\n"
                f"Forward yield: {t.forward_yield:.2f}%\n"
                f"Isolation: {t.isolation_db:.2f} dB\n"
                f"Digest: {t.block_hash[:16]}…"
            )
        else:
            text = (
                f"BLOCKED — deterministic halt\n"
                f"First blocker: {t.blockers[0]}\n"
                f"Digest: {t.block_hash[:16]}…"
            )
        self._result_label.configure(text=text)

    def _render_console(self, t: Telemetry) -> None:
        resistance = self.pogo_resistance.get()

        if t.system_ok:
            msg = (
                'Ruby OS: "All parity checks green. '
                f'Bus holding at {resistance:.2f} mΩ · '
                f'Malus yield {t.forward_yield:.2f}% · '
                f'Isolation {t.isolation_db:.2f} dB. '
                'Cleared for launch."\n\n'
                f"SHA256  {t.block_hash[:48]}…"
            )
        else:
            msg = (
                'Ruby OS: "Hold up — deterministic halt detected.\n'
                f"  →  {t.blockers[0]}\n"
                'Emergency relays engaged. Correct the bench settings."\n\n'
                f"SHA256  {t.block_hash[:48]}…"
            )

        self.console.delete("1.0", tk.END)
        self.console.insert(tk.END, msg)

    # ------------------------------------------------------------------
    # Canvas
    # ------------------------------------------------------------------
    def _draw_map(
        self,
        status_colors: Dict[str, str],
        forward_yield: float,
        isolation_db: float,
    ) -> None:
        c = self.canvas
        c.delete("all")
        self.update_idletasks()

        w = max(c.winfo_width(), 240)
        h = max(c.winfo_height(), 240)
        cx, cy = w // 2, int(h * 0.52)

        max_r = min(w, h) * 0.36
        radii = [max_r * r for r in (0.26, 0.45, 0.62, 0.78, 0.94)]
        keys = ["R1", "R2", "R3", "R4", "R5"]
        names = [
            "R-1  Core Power Vault",
            "R-2  Lamination Production",
            "R-3  Faraday Isolation Core",
            "R-4  Cryogenic Grid",
            "R-5  Boundary Interlock",
        ]

        c.create_oval(
            cx - max_r - 8,
            cy - max_r - 8,
            cx + max_r + 8,
            cy + max_r + 8,
            outline=Colors.BORDER_SOFT,
            width=1,
        )

        for r, key, name in zip(reversed(radii), reversed(keys), reversed(names)):
            color = status_colors[key]
            dash = (4, 3) if color == Colors.RED else ()
            c.create_oval(cx - r, cy - r, cx + r, cy + r, outline=color, width=2, dash=dash)
            c.create_text(cx, cy - r - 12, text=name, fill=color, font=("Segoe UI", 8, "bold"))

        core = Colors.ACCENT if status_colors["R1"] == Colors.GREEN else Colors.RED
        c.create_oval(cx - 20, cy - 20, cx + 20, cy + 20, fill=core, outline=Colors.BORDER, width=1)
        c.create_text(cx, cy, text="◆", font=("Segoe UI", 12), fill=Colors.BG)

        pad = 12
        c.create_rectangle(pad, pad, 230, 138, fill=Colors.SURFACE, outline=Colors.BORDER_SOFT)
        summary = (
            f"Forward Yield   {forward_yield:6.2f} %\n"
            f"Rev Isolation   {isolation_db:6.2f} dB\n"
            f"Thermal Load    {self.thermal_dissipation.get():6.2f} W/cm²\n"
            f"Pin Resistance  {self.pogo_resistance.get():6.2f} mΩ\n"
            f"Cryo Temp       {self.cryo_temp.get():6.2f} K"
        )
        c.create_text(
            pad + 10,
            pad + 10,
            text=summary,
            fill=Colors.TEXT,
            font=("Courier New", 9),
            anchor="nw",
        )

        lx = w - 148
        c.create_rectangle(lx, pad, w - pad, pad + 64, fill=Colors.SURFACE, outline=Colors.BORDER_SOFT)
        c.create_oval(lx + 12, pad + 14, lx + 22, pad + 24, fill=Colors.GREEN, outline="")
        c.create_text(lx + 30, pad + 19, text="Compliant", fill=Colors.TEXT, font=("Segoe UI", 9), anchor="w")
        c.create_oval(lx + 12, pad + 38, lx + 22, pad + 48, fill=Colors.RED, outline="")
        c.create_text(lx + 30, pad + 43, text="Blocked", fill=Colors.TEXT, font=("Segoe UI", 9), anchor="w")


if __name__ == "__main__":
    app = RubyOSSimulation()
    app.mainloop()
