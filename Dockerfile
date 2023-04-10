FROM node:18-alpine as build

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN yarn &&   yarn build
# TODO: clean dependences 
#RUN npm ci  && npm cache clean --force

USER node

FROM node:18-alpine As production
WORKDIR /app
# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
# Start the server using the production build
CMD [ "node", "dist/main.js" ]