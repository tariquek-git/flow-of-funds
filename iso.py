"""Thin-line isometric figures, drawn in code so they stay in the site's tokens and need no licence.
One figure per layer. Each shows the kind of institution at that layer, not decoration:
a phone (app), a parcel landing (payout), two coins (exchange), linked nodes (network),
a safe (payment company), a bank, and the central bank with its accent.
"""
import math

C, S = math.cos(math.radians(30)), math.sin(math.radians(30))
INK = '#23182F'
TOP, LEFT, RIGHT = '#FFFFFF', '#F1EEE8', '#E4DFD6'
RED, RED_L, RED_R = '#D0263E', '#E35A6C', '#B81F34'

def p(x, y, z, ox, oy, k):
    return (ox + (x - y) * C * k, oy + (x + y) * S * k - z * k)

def poly(pts, fill, sw=1.1, extra=''):
    d = ' '.join(f'{a:.1f},{b:.1f}' for a, b in pts)
    return f'<polygon points="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" {extra}/>'

def line(a, b, sw=1.1, dash=''):
    return f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{INK}" stroke-width="{sw}" stroke-linecap="round" {dash}/>'

class Scene:
    def __init__(self, ox=150, oy=70, k=12):
        self.ox, self.oy, self.k, self.out = ox, oy, k, []
        self.xs, self.ys = [], []
    def P(self, x, y, z):
        a, b = p(x, y, z, self.ox, self.oy, self.k)
        self.xs.append(a); self.ys.append(b)
        return a, b
    def box(self, x, y, z, w, d, h, top=TOP, left=LEFT, right=RIGHT):
        P = self.P
        self.out.append(poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], left))
        self.out.append(poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], right))
        self.out.append(poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top))
    def face_rect_left(self, x, y, z, w, h, fill=TOP):
        P = self.P
        self.out.append(poly([P(x, y, z), P(x + w, y, z), P(x + w, y, z + h), P(x, y, z + h)], fill, 0.9))
    def face_rect_right(self, x, y, z, d, h, fill=TOP):
        P = self.P
        self.out.append(poly([P(x, y, z), P(x, y + d, z), P(x, y + d, z + h), P(x, y, z + h)], fill, 0.9))
    def ln(self, a, b, dash=''): self.out.append(line(self.P(*a), self.P(*b), 1.1, dash))
    def cyl(self, cx, cy, z, r, h, top=TOP, side=LEFT, n=28):
        P = self.P
        ring = lambda zz: [P(cx + r * math.cos(t), cy + r * math.sin(t), zz) for t in [2 * math.pi * i / n for i in range(n)]]
        lo, hi = ring(z), ring(z + h)
        # visible side: points facing the viewer (x+y increasing)
        idx = [i for i in range(n) if math.cos(2 * math.pi * i / n) + math.sin(2 * math.pi * i / n) > -0.05]
        idx.sort(key=lambda i: (2 * math.pi * i / n + math.pi * 1.25) % (2 * math.pi))
        side_pts = [lo[i] for i in idx] + [hi[i] for i in reversed(idx)]
        self.out.append(poly(side_pts, side))
        self.out.append(poly(hi, top))
    def svg(self, w=300, h=200, label=''):
        pad = 8
        x0, x1, y0, y1 = min(self.xs) - pad, max(self.xs) + pad, min(self.ys) - pad, max(self.ys) + pad
        return f'<svg class="iso" viewBox="{x0:.0f} {y0:.0f} {x1-x0:.0f} {y1-y0:.0f}" role="img" aria-label="{label}">' + ''.join(self.out) + '</svg>'

def floor(s, x0=-1, y0=-1, w=10, d=10):
    P = s.P
    s.out.append(poly([P(x0, y0, 0), P(x0 + w, y0, 0), P(x0 + w, y0 + d, 0), P(x0, y0 + d, 0)], 'none', 0.8, 'stroke-dasharray="2 3" opacity=".45"'))

def fig_app():
    s = Scene(150, 52, 13); floor(s, -2, -2, 12, 10)
    s.box(2, 3, 0, 5, 0.6, 9.5)                       # phone standing
    s.face_rect_left(2.5, 3.6, 1.2, 4, 7.4, '#FFFFFF')  # screen
    for i, z in enumerate((6.6, 5.4, 4.2)):
        s.face_rect_left(3.0, 3.6, z, 3.0 if i else 2.0, 0.55, LEFT)
    s.face_rect_left(3.0, 3.6, 1.9, 3.0, 1.1, INK)     # one action
    return s.svg(label='A phone app')

def fig_payout():
    s = Scene(150, 60, 13); floor(s, -2, -2, 12, 10)
    s.box(1, 3, 0, 7, 4, 0.6)                         # pad
    s.box(3, 4, 4.2, 3, 2, 2.2)                       # parcel above
    s.ln((4.5, 5, 3.9), (4.5, 5, 1.0), 'stroke-dasharray="2 3"')
    s.ln((4.5, 5, 1.0), (4.1, 5, 1.6)); s.ln((4.5, 5, 1.0), (4.9, 5, 1.6))
    return s.svg(label='Money delivered at the far end')

def fig_fx():
    s = Scene(150, 66, 13); floor(s, -2, -2, 12, 10)
    s.cyl(2.5, 5, 0, 2.2, 1.2); s.cyl(2.5, 5, 1.2, 2.2, 1.2)
    s.cyl(7.5, 1.5, 0, 2.2, 1.2, top='#EEEBE5', side=RIGHT)
    s.ln((4.2, 3.6, 3.4), (6.2, 2.4, 3.4)); s.ln((6.2, 2.4, 3.4), (5.5, 2.4, 3.8)); s.ln((6.2, 2.4, 3.4), (5.8, 3.0, 3.1))
    s.ln((6.4, 3.9, 2.4), (4.4, 5.1, 2.4)); s.ln((4.4, 5.1, 2.4), (5.1, 5.1, 2.0)); s.ln((4.4, 5.1, 2.4), (4.8, 4.5, 2.7))
    return s.svg(label='One currency swapped for another')

def fig_net():
    s = Scene(150, 60, 13); floor(s, -2, -2, 12, 10)
    nodes = [(0, 0), (6, 0), (0, 6), (6, 6), (3, 3)]
    for a, b in [((0, 0), (3, 3)), ((6, 0), (3, 3)), ((0, 6), (3, 3)), ((6, 6), (3, 3))]:
        s.ln((a[0] + 0.7, a[1] + 0.7, 0.8), (b[0] + 0.7, b[1] + 0.7, 0.8))
    for x, y in sorted(nodes, key=lambda n: n[0] + n[1]):
        hub = (x, y) == (3, 3)
        s.box(x, y, 0, 1.4, 1.4, 2.6 if hub else 1.4)
    return s.svg(label='A network linking many institutions, holding no money')

def fig_pay():
    s = Scene(150, 52, 13); floor(s, -2, -2, 12, 10)
    s.box(1.5, 1.5, 0, 6, 5, 6.5)                     # safe
    s.face_rect_left(2.3, 6.5, 1.0, 4.4, 4.6, '#FFFFFF')
    P = s.P; cx, cz = 4.5, 3.3
    pts = [P(cx + 1.3 * math.cos(t), 6.5, cz + 1.3 * math.sin(t)) for t in [2 * math.pi * i / 24 for i in range(24)]]
    s.out.append(poly(pts, LEFT, 0.9))
    s.ln((cx, 6.5, cz), (cx + 0.9, 6.5, cz + 0.9))
    return s.svg(label='A licensed company holding customer money')

def gable(s, x, y, z, w, d, rise, top=TOP, l=LEFT, r=RIGHT):
    """Pitched roof, ridge along x. Front slope and right gable are the visible faces."""
    P = s.P
    s.out.append(poly([P(x, y + d / 2, z + rise), P(x + w, y + d / 2, z + rise), P(x + w, y, z), P(x, y, z)], top))
    s.out.append(poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d / 2, z + rise), P(x, y + d / 2, z + rise)], l))
    s.out.append(poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d / 2, z + rise)], r))

def classical(s, x, y, w=8, d=6, cols=5, h=3.6, accent=False, steps=2):
    top, l, r = (RED_L, RED, RED_R) if accent else (TOP, LEFT, RIGHT)
    for i in range(steps):                                   # steps
        s.box(x - (steps - i) * 0.5, y - (steps - i) * 0.3, i * 0.4, w + (steps - i), d + (steps - i) * 0.9, 0.4)
    z0 = steps * 0.4
    s.box(x + 0.3, y + 0.3, z0, w - 0.6, d - 1.6, h)           # hall behind the columns
    for i in range(cols):                                    # front columns
        cx = x + 0.4 + i * (w - 1.4) / (cols - 1)
        s.box(cx, y + d - 1.0, z0, 0.55, 0.55, h)
    s.box(x - 0.1, y - 0.1, z0 + h, w + 0.2, d + 0.2, 0.6, top, l, r)   # entablature
    gable(s, x - 0.1, y - 0.1, z0 + h + 0.6, w + 0.2, d + 0.2, 1.8, top, l, r)

def fig_bank():
    s = Scene(150, 72, 12); floor(s, -2, -2, 12, 10)
    classical(s, 0.5, 0.5, cols=4)
    return s.svg(label='A bank holding deposits')

def fig_cb():
    s = Scene(150, 72, 12); floor(s, -3, -3, 14, 12)
    classical(s, 0, 0, w=9, d=7, cols=6, h=4.2, accent=True, steps=3)
    return s.svg(label='The central bank, where a payment becomes final')

def rack(s, x, y, h=6.5):
    s.box(x, y, 0, 2.4, 2.4, h)
    for i in range(5):
        z = 0.8 + i * (h - 1.4) / 4.6
        s.face_rect_left(x + 0.3, y + 2.4, z, 1.8, 0.5, '#FFFFFF')
        s.face_rect_left(x + 1.6, y + 2.4, z + 0.15, 0.2, 0.2, INK)

def fig_net():
    s = Scene(150, 60, 13); floor(s, -2, -2, 12, 10)
    s.ln((1.2, 7.2, 0.4), (6.2, 2.2, 0.4))
    s.ln((1.2, 7.2, 0.4), (7.2, 7.2, 0.4)); s.ln((6.2, 2.2, 0.4), (7.2, 7.2, 0.4))
    rack(s, 5, 1, 6.5)
    for x, y in [(0, 6), (6, 6)]:
        s.box(x, y, 0, 1.6, 1.6, 1.2)
    return s.svg(label='Networks and processors carry the message, holding no money')

def fig_payout():
    s = Scene(150, 60, 13); floor(s, -2, -2, 12, 10)
    s.box(1, 3, 0, 3.4, 6.2, 0.45)                           # phone lying flat
    s.out.append(poly([s.P(1.3, 3.4, 0.46), s.P(4.1, 3.4, 0.46), s.P(4.1, 8.8, 0.46), s.P(1.3, 8.8, 0.46)], '#FFFFFF', 0.9))
    for i in range(3):                                       # banknotes coming down
        s.box(4.6, 1.0, 3.6 + i * 0.35, 4.2, 2.2, 0.3, top='#FFFFFF' if i == 2 else TOP)
    s.ln((6.0, 3.6, 3.4), (3.4, 5.6, 1.0), 'stroke-dasharray="2 3"'); s.ln((3.4, 5.6, 1.0), (3.6, 5.2, 1.6)); s.ln((3.4, 5.6, 1.0), (4.0, 5.6, 1.3))
    return s.svg(label='Money delivered to the recipient at the far end')

FIG = {'7': fig_app, '6': fig_payout, '5': fig_fx, '4': fig_net, '3': fig_pay, '2': fig_bank, '1': fig_cb}

if __name__ == '__main__':
    html = '<html><body style="background:#F5F3EF;display:grid;grid-template-columns:repeat(4,300px);gap:20px;padding:20px">' + ''.join(f'<div style="background:#fff;border-radius:14px">{f()}<p style="font:13px sans-serif;margin:0 12px 12px">Layer {k}</p></div>' for k, f in FIG.items()) + '</body></html>'
    open('/home/claude/whtm/shots/iso-sheet.html', 'w').write(html)
