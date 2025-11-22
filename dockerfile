# Usa la imagen base oficial de Node.js (versión 20, que es moderna)
FROM node:20-alpine

# Crea y establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de definición de dependencias e instala
# Esto mejora la caché de Docker
COPY package*.json ./
RUN npm install

# Copia el resto del código de la aplicación
COPY . .

# Expone el puerto que usa tu servidor (ej. 3000 o 8080, ajusta si es diferente)
EXPOSE 3000

# Define el comando para iniciar la aplicación
CMD [ "npm", "start" ]