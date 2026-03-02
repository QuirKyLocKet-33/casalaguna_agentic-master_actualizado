#!/bin/bash
# Script para descargar 12 avatares adicionales de cada tipo y guardarlos en frontend/crm/public/avatars/
# Robots (bottts)
for i in {13..24}; do
  curl -s "https://api.dicebear.com/7.x/bottts/png?seed=Robot$i" -o "robot$i.png"
done
# Personas (micah)
for i in {13..24}; do
  curl -s "https://api.dicebear.com/7.x/micah/png?seed=Person$i" -o "persona$i.png"
done
# Pixel art
for i in {13..24}; do
  curl -s "https://api.dicebear.com/7.x/pixel-art/png?seed=Pixel$i" -o "pixel$i.png"
done
# Abstractos (identicon)
for i in {13..24}; do
  curl -s "https://api.dicebear.com/7.x/identicon/png?seed=Abstract$i" -o "abstract$i.png"
done
# Formas (shapes)
for i in {13..24}; do
  curl -s "https://api.dicebear.com/7.x/shapes/png?seed=Shape$i" -o "forma$i.png"
done

echo "Avatares adicionales descargados en $(pwd)"
