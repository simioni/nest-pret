#!/bin/bash

# ANSI escape codes for colored logs. For more colors, see: https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
Color_Off='\033[0m'       # Text Reset
Yellow='\033[0;33m'       # Yellow
Green='\033[0;32m'        # Light Green
Blue='\033[0;34m'         # Light Blue
Purple='\033[0;35m'       # Purple
BRed='\033[1;31m'         # Bold Red
BGreen='\033[1;32m'       # Bold Green
BPurple='\033[1;35m'      # Bold Purple
BBlue='\033[1;34m'        # Bold Blue
UGreen='\033[4;32m'       # Underline Green
DarkGray="\033[1;30m"     # Dark gray


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

# run tests
printf "\n${Purple}[TESTING]${Color_Off} Running unit tests...\n"
printf "\n${Purple}[TESTING]${Color_Off} Running end-to-end tests...\n"
printf "\n${Green} All tests passed!\n"

# bump the package version
printf "\n${Purple}[VERSIONING]${Color_Off} Bumping the app version...\n"
npm version patch

# build the app
printf "\n${Purple}[BUILDING]${Color_Off} Building the app...\n"
npm run build

# build the docker image
printf "\n${Purple}[CONTAINERIZING]${Color_Off} Building the docker image...\n"
API_VERSION=$(npm pkg get version --workspaces=false | tr -d \\\") docker compose build api

# push the docker image to the container repository
printf "\n${Purple}[UPLOADING]${Color_Off} Pushing the docker image to the container repository...\n"
API_VERSION=$(npm pkg get version --workspaces=false | tr -d \\\") docker compose push

# ssh into the docker swarm manager node
printf "\n${Purple}[REACHING THE SWARM]${Color_Off} Reaching the swarm manager node...\n"

# copy the compose file into it (in case it has changed)
# copy the .env file into it? (in case it has changed)

# re-deploy the stack into the swarm
printf "\n${Purple}[DEPLOYING]${Color_Off} Starting the rolling update of containers...\n"

# Centers a given text into a given width, creating padding around it with spaces.
# arg1  The string of text to be centered
# arg2  A number describing the desired final width of the string
# arg3  An optional string to be rendered in place of the first string. This string should render at the exact same width
#       as the first, but can include styling tags (for example, for colored text)
centerText() {
  if [ -z "$3" ]
  then
    finalText="$1"
  else
    finalText="$3"
  fi
  targetWidth=$2
  if [ `expr $targetWidth % 2` == 1 ]
  then
    targetWidth=$(($targetWidth+1))
  fi
  text="$1"
  textWidth=$(wc -L <<< "$1")
  if [ `expr $textWidth % 2` == 1 ]
  then
    text="$text "
    textWidth=$(($textWidth+1))
    finalText="$finalText "
  fi
  diff=$((($targetWidth-$textWidth)/2))
  list=$(seq 1 $diff) # get a list of numbers from 1 to diff separated by spaces
  pruned="$(printf '%0.1s' $list)" # retains only the first character of each number on the list and removes the spaces
  spaces=$(echo "$pruned" | sed 's/./ /g') # replaces all characters by spaces
  echo "${spaces}${finalText}${spaces}"
}

# replaces all characters in a given string by dashes
replaceByDashes() {
  echo $1
  echo "$1" | sed 's/./-/g'
}

printBlockTop() {
  printf "\n  ${Green}.-${1}-."
}

printBlockBottom() {
  printf "\n  ${Green}'-${1}-'"
}

printBlockRow() {
  printf "\n  ${Green}| ${Color_Off}${1}${Green} |"
}

printDeployFinishedBox() {
  ICON="🚀 "
  LABEL="[SUCCESS]"
  PRETEXT=" Version "
  VERSION=$(npm pkg get version --workspaces=false | tr -d \\\")
  MIDTEXT=" of the app has been "
  POSTTEXT="deployed to Docker Swarm!"
  SECOND_LINE="It make take a few minutes to become available on all replicas."

  FULL_TEXT="|${ICON}${LABEL}${PRETEXT}${VERSION}${MIDTEXT}${POSTTEXT}|"
  FULL_TEXT_WIDTH=$(($(wc -L <<< "$FULL_TEXT")))

  SECOND_LINE_COLORED="${Color_Off}${SECOND_LINE}"
  FULL_TEXT_COLORED="${Color_Off}${ICON}${BGreen}${LABEL}${Color_Off}${PRETEXT}${BGreen}${VERSION}${Color_Off}${MIDTEXT}${Blue}${POSTTEXT}${BGreen}"

  printBlockTop $(replaceByDashes "$(centerText "" "$FULL_TEXT_WIDTH")")
  printBlockRow "$(centerText "" "$FULL_TEXT_WIDTH")"
  printBlockRow "$(centerText "$FULL_TEXT" "$FULL_TEXT_WIDTH" "$FULL_TEXT_COLORED")"
  printBlockRow "$(centerText "" "$FULL_TEXT_WIDTH")"
  printBlockRow "$(centerText "$SECOND_LINE" "$FULL_TEXT_WIDTH" "$SECOND_LINE_COLORED")"
  printBlockRow "$(centerText "" "$FULL_TEXT_WIDTH")"
  printBlockBottom $(replaceByDashes "$(centerText "" "$FULL_TEXT_WIDTH")")

}

printWhales() {
  printf "\n"
  printf "\n${BBlue}                   .${Color_Off}                                                        "
  printf "\n${BBlue}                  \":\"${Color_Off}                          ${BBlue}.. . ...${Color_Off}                      "
  printf "\n                ___${BBlue}:${Color_Off}____     |\"\\/\"|           ${BBlue}\`  \":\"      ${Color_Off}            "
  printf "\n              ,'        \`.    \\  /             ___${BBlue}:${Color_Off}______     |\"\\/\"|    "
  printf "\n              |  O        \___/  |           ,'          \`.    \\  /       ${BBlue}  "
  printf "\n${BBlue}            ~^~^~^~^~^~^~^~^~^~^~^~^~^~^~^   ${Color_Off}|  O          \___/  | ${BBlue}~^~^~^~^ "
  printf "\n${BBlue}      ~^~^~^~^       ~^~^~^~^       ~^~^~^~^~^~^~^~^~^~^~^~^~^~^~^~^~^~     ^~^~ "
  printf "\n"
  printf "\n"
}

printDeployFinishedBox
printWhales
