FROM node:latest

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# Bundle app source
COPY ./dist ./dist
# COPY .env .env

EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]
