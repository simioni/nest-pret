#!/bin/bash

# ANSI escape codes for colored logs. See: https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
Color_Off='\033[0m'       # Text Reset
BRed='\033[1;31m'         # Red
UGreen='\033[4;32m'       # Green

# makes sure the working directory is clean
git update-index --really-refresh >> /dev/null
if git diff-index --quiet HEAD
then
  GIT_MODS="clean"
else
  printf "${BRed}[ERROR] ${Color_Off}Working directory is not clean!\n" >&2
  printf "${Color_Off}Make sure to ${UGreen}commit any changes${Color_Off} before pushing a new deployment.\n\n" >&2
  exit 1
fi
echo $GIT_MODS
