@echo off
title GLITCH WORLD - WEB EDITION
echo Starting local web server for Glitch World...
start http://localhost:8080/
cd /d "%~dp0"
python -m http.server 8080
