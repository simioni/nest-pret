#!/bin/bash

# ANSI escape codes for colored logs. For more colors, see: https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
Color_Off='\033[0m'         # Text Reset
Regular='\033[0m'           # Bold
Bold='\033[1m'              # Bold
Black='\033[0;30m'          # Black
Yellow='\033[0;33m'         # Yellow
Red='\033[31m'              # Red
Green='\033[0;32m'          # Light Green
Blue='\033[0;34m'           # Light Blue
Purple='\033[0;35m'         # Purple
BRed='\033[1;31m'           # Bold Red
BGreen='\033[1;32m'         # Bold Green
BPurple='\033[1;35m'        # Bold Purple
BBlue='\033[1;34m'          # Bold Blue
UGreen='\033[4;32m'         # Underline Green
URed='\033[4;31m'           # Underline Red
DarkGray="\033[1;30m"       # Dark gray
Flag_Green='\033[42;30;4m'  # Black on Green underlined
Flag_Red='\033[101;30;4m'   # Black on Red underlined

function existsInList() {
    LIST=$1
    DELIMITER=$2
    VALUE=$3
    echo $LIST | tr "$DELIMITER" '\n' | grep -F -q -x "$VALUE"
}
validVersions="major, minor, patch"
BUMP_VERSION='patch'

# retrieve command options
while [ True ]; do
if [ "$1" = "--version" -o "$1" = "-v" ]; then
    if !(existsInList "$validVersions" ", " $2); then
        printf " ${Flag_Red}[ERROR]${Color_Off} ${Bold}$2${Regular} is not a valid option for ${Bold}--version${Regular}. ${Bold}Acceptable values are ${Green}$validVersions${Color_Off}. \n\n" >&2
        exit 1
    fi
    BUMP_VERSION=$2
    shift 2
elif [ "$1" = "--quiet" -o "$1" = "-q" ]; then
    IS_QUIET="true"
    shift 1
else
    break
fi
done

printf "${Purple}[PREPARING]${Color_Off}${Bold} Continuous Deployment of a ${Purple}$BUMP_VERSION${Color_Off}${Bold} release \n${Color_Off}${Regular}"

# makes sure the working directory is clean
git update-index --really-refresh >> /dev/null
if git diff-index --quiet HEAD
then
  printf "\n${Color_Off} Git directory is clean. Starting CD pipeline... \n"
else
  printf "\n ${Flag_Red}[ERROR]${Color_Off}${Bold} Working directory is not clean!\n\n" >&2
  printf "${Color_Off} All commits intended to go into this release need to be merged and and the repo needs to be in a clean state before deploying.\n\n" >&2
  printf "${Color_Off} This script will build and test the code, integrate and bump the version number, containerize and push the images, then start the continous deployment of each container in the swarm. \n\n" >&2
  printf "${Color_Off} Make sure to ${Red}commit any changes${Color_Off} or stash them before continuing.\n\n" >&2
  exit 1
fi

# run tests
printf "\n${Purple}[TESTING]${Color_Off} Running unit tests...\n"
npm run test

printf "\n${Purple}[TESTING]${Color_Off} Running e2e tests...\n"
npm run e2e

printf "\n${Green}✅ All tests passed!\n"

# bump the package version
printf "\n${Purple}[VERSIONING]${Color_Off} Bumping the app version...\n"
npm version $BUMP_VERSION

# build the app
printf "\n${Purple}[BUILDING]${Color_Off} Building the dist...\n"
npm run build

# build the docker image
printf "\n${Purple}[CONTAINERIZING]${Color_Off} Building the docker image...\n"
export API_VERSION=$(npm pkg get version --workspaces=false | tr -d \\\")
docker compose build

# push the docker image to the container repository
printf "\n${Purple}[UPLOADING]${Color_Off} Pushing the docker image into the container repository...\n"
docker tag 127.0.0.1:5000/nest-pret:$API_VERSION 127.0.0.1:5000/nest-pret:latest
docker push 127.0.0.1:5000/nest-pret:$API_VERSION
docker push 127.0.0.1:5000/nest-pret:latest

# ssh into the docker swarm manager node
printf "\n${Purple}[REACHING]${Color_Off} Reaching the swarm manager node...\n"
sleep 1

# copy the .env and docker-compose.yml files into it (in case they have changed)
printf "\n${Purple}[COPYING]${Color_Off} The new compose file and .env ...\n"
sleep 2

# re-deploy the stack into the swarm
printf "\n${Purple}[DEPLOYING]${Color_Off} Starting the rolling update of containers...\n"
# docker stack deploy -c docker-compose.yml pret
docker stack deploy -c docker-compose.yml --resolve-image changed pret

printf "\n${Purple}[ROLLING UPDATE]${Color_Off} \n"
docker stack ps pret
sleep 2

printf "\n${Purple}[DONE]${Color_Off} \n"

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
  SECOND_LINE="It may take a few minutes to become available on all replicas."

  FULL_TEXT="|${ICON}${LABEL}${PRETEXT}${VERSION}${MIDTEXT}${POSTTEXT}|"
  FULL_TEXT_WIDTH=$(($(wc -L <<< "$FULL_TEXT")))

  SECOND_LINE_COLORED="${Color_Off}${SECOND_LINE}"
  FULL_TEXT_COLORED="${Color_Off}${ICON}${Flag_Green}${LABEL}${Color_Off}${PRETEXT}${BGreen}${VERSION}${Color_Off}${MIDTEXT}${Blue}${POSTTEXT}${BGreen}"

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
  printf "\n"
}

printDeployFinishedBox
printWhales
