#!/bin/bash

# ANSI escape codes for colored logs. For more colors, see: https://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
Color_Off='\033[0m'       # Text Reset
BRed='\033[1;31m'         # Bold Red
BGreen='\033[1;32m'       # Bold Green
BPurple='\033[1;35m'      # Bold Purple
UGreen='\033[4;32m'       # Underline Green

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
printf "\n${BPurple}[TESTING]${Color_Off} Running unit tests...\n"
printf "\n${BPurple}[TESTING]${Color_Off} Running end-to-end tests...\n"
printf "\n${BGreen}[TESTING]${BGreen} All tests passed!\n"

# bump the package version
printf "\n${BPurple}[VERSIONING]${Color_Off} Bumping the app version...\n"
npm version patch

# build the app
printf "\n${BPurple}[BUILDING]${Color_Off} Building the app\n"
npm run build

# build the docker image
printf "\n${BPurple}[CONTAINERIZING]${Color_Off} Building the docker image\n"
API_VERSION=$(npm pkg get version --workspaces=false | tr -d \\\") docker compose build api

# push the docker image to the container repository
printf "\n${BPurple}[UPLOADING]${Color_Off} Pushing the docker image to the container repository\n"
API_VERSION=$(npm pkg get version --workspaces=false | tr -d \\\") docker compose push

# ssh into the docker swarm manager node
printf "\n${BPurple}[REACHING THE SWARM]${Color_Off} Reaching the swarm manager node\n"

# copy the compose file into it (in case it has changed)

# re-deploy the stack into the swarm
printf "\n${BPurple}[DEPLOYING]${Color_Off} Starting the rolling-update of the containers inside the docker swarm for the new ones\n"

printf "\n${BGreen}------------------------------------------------------------------------"
printf "\n${BGreen}| 🚀 ${BGreen}[SUCCESS]${Color_Off} A new version of the app have been deployed to the swarm! ${BGreen}|\n"
printf "\n${BGreen}------------------------------------------------------------------------"
