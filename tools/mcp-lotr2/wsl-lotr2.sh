#!/usr/bin/env bash
# wsl-lotr2.sh — backend ISOLÉ du MCP lotr2 : pilote DOSBox dans WSL sur un
# display X virtuel (Xvfb), via xdotool/import. L'input ne touche jamais la
# vraie souris/clavier de l'utilisateur (cf. mémoire mcp-lotr2-isolation).
#
# Appelé depuis le serveur MCP (Windows) via :
#   wsl -d <distro> -- bash <ce-script> <action> [args...]
# Chaque action imprime UNE ligne JSON sur stdout.
#
# Actions : start | status | close | key <xdotoolkeys> | type <texte> |
#           click <x> <y> [left|right] [double] |
#           drag <x1> <y1> <x2> <y2> [left|right] | capture <chemin_png>
set -uo pipefail

DISPLAY_NUM="${LOTR2_DISPLAY:-:1}"
export DISPLAY="$DISPLAY_NUM"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="$SCRIPT_DIR/conf/dos-wsl.conf"
WIN_NAME="DOSBox"

err() { printf '{"ok":false,"error":%s}\n' "$(json_str "$1")"; exit 1; }
json_str() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk 'BEGIN{printf "\""} {printf "%s",$0} END{printf "\""}'; }

# setsid : détache complètement les processus de la session de la commande
# `wsl -- ...`, sinon WSL tue ce groupe de processus dès que la commande rend
# (dosbox mourait avec « X connection broken »).
ensure_xvfb() {
  if ! pgrep -f "Xvfb $DISPLAY_NUM" >/dev/null 2>&1; then
    setsid Xvfb "$DISPLAY_NUM" -screen 0 1024x768x24 -nolisten tcp </dev/null >/tmp/lotr2-xvfb.log 2>&1 &
    sleep 1
  fi
}

find_win() { xdotool search --name "$WIN_NAME" 2>/dev/null | head -1; }

action="${1:-status}"; shift || true

case "$action" in
  start)
    ensure_xvfb
    if pgrep -x dosbox >/dev/null 2>&1; then
      echo '{"ok":true,"already":true,"running":true}'; exit 0
    fi
    [ -f "$CONF" ] || err "conf introuvable: $CONF"
    setsid dosbox -conf "$CONF" </dev/null >/tmp/lotr2-dosbox.log 2>&1 &
    pid=$!
    # attendre l'apparition de la fenêtre
    win=""
    for _ in $(seq 1 20); do
      sleep 0.6
      win="$(find_win)"
      [ -n "$win" ] && break
    done
    if [ -z "$win" ]; then
      echo "{\"ok\":true,\"pid\":$pid,\"window\":false,\"note\":\"lancé mais fenêtre non détectée\"}"
    else
      echo "{\"ok\":true,\"pid\":$pid,\"window\":true,\"display\":\"$DISPLAY_NUM\"}"
    fi
    ;;

  status)
    if pgrep -x dosbox >/dev/null 2>&1; then
      win="$(find_win)"
      if [ -n "$win" ]; then
        geom="$(xdotool getwindowgeometry "$win" 2>/dev/null | tr '\n' ' ')"
        echo "{\"ok\":true,\"running\":true,\"hasWindow\":true,\"display\":\"$DISPLAY_NUM\",\"geom\":$(json_str "$geom")}"
      else
        echo '{"ok":true,"running":true,"hasWindow":false}'
      fi
    else
      echo '{"ok":true,"running":false,"hasWindow":false}'
    fi
    ;;

  key)
    win="$(find_win)"; [ -n "$win" ] || err "fenêtre introuvable"
    xdotool windowactivate --sync "$win" key --clearmodifiers "$1" && echo '{"ok":true}' || err "échec key"
    ;;

  type)
    win="$(find_win)"; [ -n "$win" ] || err "fenêtre introuvable"
    xdotool windowactivate --sync "$win" type --clearmodifiers "$1" && echo '{"ok":true}' || err "échec type"
    ;;

  click)
    x="${1:?x requis}"; y="${2:?y requis}"; btn_name="${3:-left}"; dbl="${4:-single}"
    btn=1; [ "$btn_name" = "right" ] && btn=3
    win="$(find_win)"; [ -n "$win" ] || err "fenêtre introuvable"
    # Pas de windowactivate (échoue sans gestionnaire de fenêtres, et la
    # fenêtre DOSBox a déjà le focus puisqu'elle est seule). DOSBox/SDL ne
    # latche le clic que s'il voit du MOUVEMENT avant, et un down/up étalé sur
    # plusieurs frames : on approche par un point voisin puis on maintient.
    dx=$((x-3)); dy=$((y-3))
    [ "$dx" -lt 0 ] && dx=0; [ "$dy" -lt 0 ] && dy=0
    xdotool mousemove --window "$win" "$dx" "$dy"; sleep 0.04
    xdotool mousemove --window "$win" "$x" "$y"; sleep 0.12
    xdotool mousedown "$btn"; sleep 0.10; xdotool mouseup "$btn"
    if [ "$dbl" = "double" ]; then
      sleep 0.08; xdotool mousedown "$btn"; sleep 0.10; xdotool mouseup "$btn"
    fi
    echo "{\"ok\":true,\"x\":$x,\"y\":$y,\"button\":\"$btn_name\"}"
    ;;

  drag)
    x1="${1:?x1 requis}"; y1="${2:?y1 requis}"; x2="${3:?x2 requis}"; y2="${4:?y2 requis}"; btn_name="${5:-left}"
    btn=1; [ "$btn_name" = "right" ] && btn=3
    win="$(find_win)"; [ -n "$win" ] || err "fenêtre introuvable"
    sx=$((x1-3)); sy=$((y1-3))
    [ "$sx" -lt 0 ] && sx=0; [ "$sy" -lt 0 ] && sy=0
    xdotool mousemove --window "$win" "$sx" "$sy"; sleep 0.04
    xdotool mousemove --window "$win" "$x1" "$y1"; sleep 0.12
    xdotool mousedown "$btn"; sleep 0.14
    xdotool mousemove --window "$win" "$x2" "$y2"; sleep 0.22
    xdotool mouseup "$btn"; sleep 0.08
    echo "{\"ok\":true,\"from\":{\"x\":$x1,\"y\":$y1},\"to\":{\"x\":$x2,\"y\":$y2},\"button\":\"$btn_name\"}"
    ;;

  capture)
    out="${1:?chemin requis}"
    win="$(find_win)"
    mkdir -p "$(dirname "$out")"
    if [ -n "$win" ]; then
      import -window "$win" "$out" 2>/dev/null || import -window root "$out" 2>/dev/null || scrot "$out"
    else
      import -window root "$out" 2>/dev/null || scrot "$out"
    fi
    [ -f "$out" ] && echo "{\"ok\":true,\"path\":$(json_str "$out")}" || err "capture échouée"
    ;;

  close)
    pkill -x dosbox 2>/dev/null
    echo '{"ok":true,"closed":true}'
    ;;

  *)
    err "action inconnue: $action"
    ;;
esac
