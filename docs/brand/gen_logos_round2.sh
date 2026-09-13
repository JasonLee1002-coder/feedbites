#!/usr/bin/env bash
# 常來點 EatAgain logo 第二輪：同一組概念分別交給 OpenAI 與 Gemini 生成
cd "$(dirname "$0")/logo-candidates" || exit 1
mkdir -p round2 && cd round2

COMMON="Flat vector logo, solid pure white background, absolutely no glow, no shadow, no vignette, no gradient, no mockup, no 3D. Palette: persimmon orange #D9541E, deep brown #3A2418, cream #FFF6EC. Friendly rounded shapes, bold simple silhouette that still reads at 32px. Centered with generous margin. Brand: a Taiwanese restaurant loyalty app named 常來點 (EatAgain) - customers scan a QR at the table, earn points, and come back again."

declare -A P
P[01_bowl_smile_icon]="$COMMON App icon only, no text: a rounded-square orange tile with a white smiling rice bowl; a curved return arrow arcs over the bowl like rising steam."
P[02_steam_loop]="$COMMON Icon only, no text: a white noodle bowl on an orange circle; the steam rising from the bowl twists into a single continuous loop symbol meaning 'come back again'."
P[03_knock_bowl]="$COMMON Icon only, no text: a cheerful bowl being tapped by a pair of chopsticks, with two small motion ticks, playful 'knocking on the bowl' gesture, orange bowl and brown chopsticks."
P[04_coin_bite]="$COMMON Icon only, no text: a round orange point coin with a small bite taken out of its edge, and a simple smile inside the coin. Suggests eating and collecting points."
P[05_storefront_dot]="$COMMON Icon only, no text: a tiny restaurant storefront with a striped orange awning, the door slightly open, and a small glowing-free solid dot above the door like a location pin, warm and welcoming."
P[06_lockup_bowl]="$COMMON Horizontal lockup: left an orange rounded-square icon with a white smiling bowl and a return arrow; right the Traditional Chinese wordmark 常來點 in a rounded bold typeface, with EatAgain in smaller rounded Latin letters beneath. Spell exactly 常來點 and EatAgain, no other text."
P[07_lockup_knock]="$COMMON Horizontal lockup: left an icon of a bowl tapped by chopsticks; right the wordmark 常來點 in a warm rounded bold Chinese typeface and EatAgain below it. Spell exactly 常來點 and EatAgain, no other text."
P[08_stamp_seal]="$COMMON Icon only: a round red-orange Taiwanese seal stamp style mark, inside it a minimalist bowl whose rim is a circular arrow; clean vector, no texture, no text."

for name in "${!P[@]}"; do
  python ~/.claude/tools/openai_image_gen.py --size 1024x1024 --quality high --prompt "${P[$name]}" --output "${name}_openai.png" > "${name}_openai.log" 2>&1 &
  python ~/.claude/tools/gemini_image_gen.py --prompt "${P[$name]}" --output "${name}_gemini.png" > "${name}_gemini.log" 2>&1 &
done
wait
ls -1 *.png 2>/dev/null | wc -l
for f in *.log; do if [ ! -f "${f%.log}.png" ]; then echo "FAILED $f"; tail -n 3 "$f"; fi; done
