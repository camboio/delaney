FROM keymetrics/pm2:latest-stretch

WORKDIR /usr/src/app

COPY . .

RUN npm install

CMD ["pm2-runtime", "index.js"]