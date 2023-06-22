FROM node:18
WORKDIR /
COPY . /
RUN npm install
EXPOSE 80/tcp
CMD ["npm", "start"]
