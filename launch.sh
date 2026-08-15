#!/bin/bash
# Script de inicio rápido para MD Wysiwyg

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if [ -f "$DIR/dist/MD-Wysiwyg-1.0.0.AppImage" ]; then
    echo "Iniciando MD Wysiwyg desde AppImage..."
    "$DIR/dist/MD-Wysiwyg-1.0.0.AppImage" "$@"
elif [ -f "$DIR/dist/linux-unpacked/md-wysiwyg" ]; then
    echo "Iniciando MD Wysiwyg ejecutable..."
    "$DIR/dist/linux-unpacked/md-wysiwyg" "$@"
else
    echo "Iniciando MD Wysiwyg con Electron en desarrollo..."
    npm start --prefix "$DIR" -- "$@"
fi
