# node-express-cli

node-express-cli es un CLI simple y opinado para generar la configuración inicial de un proyecto en express utilizando [Typescript](https://www.typescriptlang.org/). Es util para generar proyectos API REST y API's GraphQL.
node-express-cli actualmente ofrece las siguientes caracteristicas

- Creación de la configuración inicial del proyecto (estructura de directorios, scripts, dependencias de desarrollo, etc.)
- Instalación de Prettier
- Instalación de Eslint
- Creación de módulos
- Instalación de Socket con socket.io

## Uso

Lo primero que debes ejecutar es el comando `npm install -g node-express-cli` para instalarlo como dependencia global. Posteriormente se debe ejecutar el siguiente comando dentro de un directorio vacío que será la raíz del proyecto.

```
node-express-cli init
```

Existen 3 opciones para generar el proyecto:

- API Rest
- GraphQL

Cada una generará una configuración diferente en cuanto a middlewares y dependencias de desarrollo. Además la manera en que se configura el archivo index.ts del servidor es diferente para cada una.

Usa `node-express-cli --help` Para ver una lista completa de los comandos disponibles.

Nota: Para la plataforma Windows existe un pequeño bug al crear el proyecto: No se crea un script "dev". Se está trabajando en ello, pero si notas que no existe dicho script dentro del package.json puedes agregarlo manualmente copiando y pegando la siguiente línea.

```
"dev": "tsc-watch --onSuccess \"node build/index\""
```

Notarás además que el package.json está de manera minificada, en una sola línea, ocurre lo mismo con el archivo tsconfig.json. Ambos pueden ser formateados correctamente utilizado algun formateador de código como prettier.

## Estructura de directorios

![Estructura](./docs/img/estructura.png)

La estructura generada trata de seguir una arquitectura modular, en donde se tiene un directorio para configuraciones, para base de datos, entidades, helpers, middlewares y el más importante modules.
En este último se contiene cada módulo del proyecto.

Para proyectos API REST se incluyen alias de módulo o lo que es lo mismo, abreviaciones para acceder a cada directorio. De esta manera el directorio middlewares es accedido como @middlewares, services como @services, modules como @modules, etc. (Actualmente esta característica no es soportada para proyectos Web o GraphQL)
Por ejemplo, una importación se haría de la siguiente manera:

![Importación](./docs/img/importacion.png)

## Base de datos

En cuanto a bases de datos actualmente el paquete soporta 2 opciones

- SQL con [TypeORM](https://typeorm.io/#/)
- MongoDB con [Mongoose](https://mongoosejs.com/)

Para agregar una de las dos opciones utiliza el comando `node-express-cli install:database`

Una vez creado el proyecto, debes configurar los parámetros de la base de datos dentro del archivo .env
Mismos que serán leídos dentro del archivo src/database/database.ts para crear la conexión. Este último debes personalizarlo también, dependiendo el SGDB que deseas utilizar.
Cuando los parámetros sean correctos debes llamar la conexión en el archivo principal del servidor index.ts  

Si usas Typeorm, agrega esto en el método start() del index.ts

```
AppDataSource.initialize()
      .then(() => {
        logger.info('🚀 Database conection is online...')
      })
      .catch(console.log)
```
Si usas mongoose basta con importar el módulo de conexión al inicio del index.ts

```
import './database/database';
```
Es muy importante que las entidades de base de datos dentro del directorio src/entities/ terminen con extensión .entity.ts, de lo contrario no podrán ser accedidas por typeorm al realizar el proceso de introspección y se generará un error al arrancar el servidor. 

Nota: TypeORM es solo un ORM, no instala la librería específica de postgres, mysql o cualquier otro manejador de base de datos. Para esto debes ejecutar el comando específico de la librería, como `yarn add pg` o `yarn add mysql`.

### Migraciones
Si utiliza TypeORM se agregarán 3 comandos nuevos al package.json
- m:run
- m:revert
- m:generate  

Cuya función es correr, revertir y generar migraciones, respectivamente. Si desea saber más acerca de las migraciones, visite la [documentación oficial](https://typeorm.io/migrations) de TypeORM

## Creación de módulos
Un módulo comprende un controlador, un archivo de rutas, un servicio y un archivo de validaciones, todos dentro de un mismo directorio dentro de modules. Esto permite que la aplicación se divida en piezas que son fácilmente conectables. 
Para conectar las rutas de un módulo es necesario agregar el router del módulo al router principal del servidor, router.ts.

![Modulo](./docs/img/modulo.png)

Con esto y sin mayor configuración adicional, las rutas del módulo ya estarán disponibles. Pues el router principal ya está siendo cargado en el archivo principal del servidor. 

Para crear un módulo se utiliza el comando:
```
node-express-cli make:module
```
Cada que se crea un módulo debes asignarle un nombre y de qué tipo será: Rest o GraphQL. Asegurate de seleccionar la misma opción que utilizaste para crear el proyecto, pues el módulo varia ligeramente entre cada tipo de configuración. 

## Validación de Request
El body de un request puede ser validado utilizando la librería [express-validator](https://www.npmjs.com/package/express-validator). 
Para esto un módulo incluye un archivo de validación en donde se colocan cada conjunto de validaciones dentro de un array.

![Validators](./docs/img/validacion.png)

Y para utilizarlos se pasan como middleware a una ruta, seguidos del middleware validateBody, encargado de obtener todos los mendajes de error y regresarlos como una respuesta estándar al cliente.

![Validators](./docs/img/validators_uso.png)

## Logger

Un proyecto REST incluye un Logguer utilizando la librería [winston](https://www.npmjs.com/package/winston). Este logger puede ser utilizado de la siguiente manera: 

![Log](./docs/img/log.png)

## Manejo de errores 
El proyecto incluye un middleware manejador de errores llamado handleErrorMiddleware dentro de /src/middlewares/error_handler.ts, con el propósito de generar respuestas de error estándar al cliente. Este middleware ya está configurado y será ejecutado si una función controladora llama a next(error). 

error debe contener una instancia de la clase ErrorHandler.

El patrón propuesto es que el servicio sea el que lance los errores y el controlador solo los controle para pasarlos a la siguiente capa.

### Servicio
![Log](./docs/img/error_servicio.png)

### Controlador
![Log](./docs/img/error_controlador.png)

## Instalación de Socket
Adicionalmente después de crear el servidor es posible instalar el uso de sockets mediante la librería [https://socket.io/](socket.io). 
Para ello utilizar el comando 
```
node-express-cli install:socket
```

Es importante que esta acción se realice antes de personalizar el archivo principal del servidor index.ts, pues reemplazará todo su contenido con la nueva configuración para soportar el socket.

## Instalación de Prettier y ESlint
La instalación de [Prettier](https://prettier.io/) y [ESlint](https://eslint.org/) se incluyen como opciones separadas para ofrecer una configuración más granular. 
Para instalar prettier: 
```
node-express-cli install:prettier
```
Para instalar ESlint
```
node-express-cli install:eslint
```
Es necesario instalar prettier para poder instalar eslint. 

## Scaffolding de autenticación
Es posible instalar un módulo de autenticación con lo básico necesario para autenticar un usuario con JWT, haciendo uso de la conocida librería [Passport](https://www.npmjs.com/package/passport).  
Para instalarlo utiliza el comando `node-express-cli install:auth`.
Esta acción creará un modelo básico de usuario, una estrategia de passport y un módulo de autenticación. 
Solamente deberás agregar las rutas del módulo auth al router principal de la aplicación y crear/ejecutar las migraciones para la base de datos si estás utilizando TypeORM

## Envío de Emails
Es posible agregar soporte para envío de emails vía nodemailer, utilizando el comando `node-express-cli install:mailer`.  
Esta acción instalará una clase Mailer, dentro del directorio helpers, la cual tiene la lógina necesaria para envío de emails y notificaciones.  
Se instala además un template básico html para las notificaciones, el cuál es compilado mediante handlebars. Un ejemplo de envío de una notificación es: 

```
Mailer.sendNotification({
    to: 'joe@gmail.com',
    subject: 'Asunto del mensaje',
    atte: 'Foo Bar',
    content: 'Contenido de la notificación',
    greeting: 'Hola!',
    action: {
      title: 'Visita nuestro sitio',
      url: 'http://www.my-site.com',
    },
})
```

## Levantar el servidor 

### Desarrollo
Para levantar el servidor en desarrollo usar el script "dev"

```
npm run dev
```
Si no existe el directorio build antes de ejecutar este comando, es posible que sea necesario parar y ejecutar el comando nuevamente.

### Producción

Para compilar el proyecto utilizar el comando: 
```
npm run build
```

Para iniciar el servidor compilado utilizar el comando:

```
npm start
```

