# node-express-cli

node-express-cli es un CLI simple y opinado para generar la configuración inicial de un proyecto en express utilizando [Typescript](https://www.typescriptlang.org/), inspirado fuertemente en la arquitectura de Nest pero sin la complejidad que este framework implica y en la cli de Laravel para generar nuevos archivos.
node-express-cli actualmente ofrece las siguientes caracteristicas.

node-express-cli no es un framework en sí mismo, sino una herramienta que te ayudaraá a generar toda la estructura inicial de un proyecto, brindándote una arquitectura sólida y escalable, asì como una cli que te ayudará a generar nuevos archivos como migraciones, servicios, entidades, módulos, etc. 

## Uso

Lo primero que debes ejecutar es el comando `npm install -g node-express-cli` para instalarlo como dependencia global. Posteriormente se debe ejecutar el siguiente comando dentro de un directorio vacío que será la raíz del proyecto.

```bash
node-express-cli init
```

Existen 2 opciones para generar el proyecto:

- API Rest
- GraphQL

Cada una generará una configuración diferente en cuanto a middlewares y dependencias de desarrollo. Además la manera en que se configura el archivo index.ts del servidor es diferente para cada una.

Usa `node-express-cli --help` Para ver una lista completa de los comandos disponibles.

El proyecto ahora incluye y debe incluir un archivo llamado cli.config.json con las opciones seleccionadas para cada tipo de proyecto y orm. 
```JSON
{
    "project": "GraphQL API", -> opciones disponibles:  REST API | GraphQL API
    "orm": "mongo", -> opciones disponibles: mongoose | typeorm | sequelize
    "package_manger": "npm" -> opciones disponibles: npm | yarn | pnpm | bun
}
```

## Estructura de directorios

![Estructura](./docs/img/estructura.png)

La estructura generada trata de seguir una arquitectura modular, en donde se tiene un directorio para configuraciones, para base de datos, entidades, helpers, middlewares y el más importante: modules, el cual contiene cada módulo del proyecto.

Para proyectos API REST se incluyen alias de módulo o lo que es lo mismo, una abreviación para acceder al directorio src desde cualquier ubicación dentro del mismo; para esto se utiliza el paquete `module-alias`. De esta manera el directorio middlewares es accedido como @/middlewares, services como @/services, modules como @/modules, etc. (Actualmente esta característica no es soportada para proyectos Web o GraphQL)
Por ejemplo, una importación se haría de la siguiente manera:

```TS
import { logger } from '@/helpers/logger';
```

en lugar de 

```TS
import { logger } from '../../../helpers/logger';
```


Si lo deseas puedes extender estos alias modificando el archivo alias.ts y la configuración de typescript en tsconfig.json

## Base de datos

En cuanto a bases de datos actualmente el paquete soporta 2 opciones

- SQL con [TypeORM](https://typeorm.io/#/), [Sequelize](https://sequelize.org/) o [Prisma](https://www.prisma.io/typescript) 
- MongoDB con [Mongoose](https://mongoosejs.com/)

Para agregar una de las dos opciones utiliza el comando `node-express-cli install:database`

Una vez creado el proyecto, debes configurar los parámetros de la base de datos dentro del archivo .env
Mismos que serán leídos dentro del archivo src/database/database.ts para crear la conexión. Este último debes personalizarlo también, dependiendo el SGDB que deseas utilizar.
Cuando los parámetros sean correctos debes llamar la conexión en el archivo principal del servidor index.ts  

Si usas Typeorm, agrega esto en el método start() del index.ts

```TS
AppDataSource.initialize()
      .then(() => {
        logger.info('🚀 Database conection is online...')
      })
      .catch(console.log)
```
Si usas mongoose basta con importar el módulo de conexión al inicio del index.ts

```TS
import './database/database';
```

Para el caso de Typeorm las nuevas entidades deben ser agregadas como parte del array de entidades en el archivo src/database/datasource.ts, pero para mayor información visita la [documentación oficial](https://typeorm.io/)

Nota: TypeORM es solo un ORM, no instala la librería específica de postgres, mysql o cualquier otro manejador de base de datos. Para esto debes ejecutar el comando específico de la librería, como `yarn add pg` o `yarn add mysql`.

### Migraciones
Si utiliza TypeORM se agregarán 6 comandos nuevos al package.json
- m:run
- m:revert
- m:generate  
- m:create  
- m:drop  
- m:run:fresh  

Cuya función es correr, revertir y generar migraciones, respectivamente. Si desea saber más acerca de las migraciones, visite la [documentación oficial](https://typeorm.io/migrations) de TypeORM

Para el caso de Sequelize también se incluyen una lista de comandos en el package.json

- db:migrate
- db:migrate:undo
- db:migrate:fresh
- db:make:migration

Prisma por su parte no ocupa crear migraciones manualmente, ya que estas deberán ser creadas a partir de su schema. La lista de comandos para prisma es la siguiente:

- m:run
- m:run:deploy
- m:reset
- m:generate

## Creación de módulos
Un módulo comprende un controlador, un archivo de rutas, un servicio y un archivo de validaciones, todos dentro de un mismo directorio dentro de modules. Esto permite que la aplicación se divida en piezas que son fácilmente conectables. 
Para conectar las rutas de un módulo es necesario agregar el router del módulo al router principal del servidor, router.ts.

```TS
import { Router } from 'express';
import myRoutes from '@/modules/myModule/myModule.routes';

const router = Router();
router.use('/my-optional-prefix', myRoutes);

export default router;
```

Con esto y sin mayor configuración adicional, las rutas del módulo ya estarán disponibles. Pues el router principal ya está siendo cargado en el archivo principal del servidor. 

Para crear un módulo se utiliza el comando:
```bash
node-express-cli make:module
```
Cada que se crea un módulo debes asignarle un nombre.

## Validación de Request
El body de un request puede ser validado utilizando la librería [express-validator](https://www.npmjs.com/package/express-validator). 
Para esto un módulo incluye un archivo de validación en donde se colocan cada conjunto de validaciones dentro de un array y en la última posición se coloca el middleware bodyValidator, el cual se encarga de obtener los mensajes de error generados por express-validator y devolverlos como una respuesta estándar al cliente.

```TS
import { check } from 'express-validator';
import { bodyValidator } from '@/middlewares/validator';

export const storeValidators = [
  check('name').isString().isLength({ min: 3, max: 255 }),
  check('email').isEmail(),
  check('password').isString().isLength({ min: 6, max: 255 }),
  bodyValidator,
];

export const updateValidators = [
  check('name').isString().isLength({ min: 3, max: 255 }),
  check('email').isEmail(),
  check('password').isString().isLength({ min: 6, max: 255 }),
  bodyValidator,
];
```

Y para utilizarlos se pasan como middleware, ya que express permite pasar un array de middlewares a una ruta.

```TS
import { storeValidators } from './user.validators';
router.post('/', storeValidators, userController.store);
```

## Logger

Un proyecto REST incluye un Logguer utilizando la librería [winston](https://www.npmjs.com/package/winston). Este logger puede ser utilizado de la siguiente manera: 

```TS
import { logger } from '@/helpers/logger';

logger.log('Some Log');
logger.info('Información');
logger.error('Error');
logger.warn('Advertencia');
logger.error('Error', error);
```

## Manejo de errores 
El proyecto incluye un middleware manejador de errores llamado handleErrorMiddleware dentro de /src/middlewares/error_handler.ts, con el propósito de generar respuestas de error estándar al cliente. Este middleware ya está configurado y será ejecutado si una función controladora llama a next(error). 

`error` debe contener una instancia de la clase `HTTPError`. Se incluyen tambien una serie de métodos de utilidad dentro del `error_handler` que nos ayudarán a generar estas instancias. 

El patrón propuesto es que el servicio sea el que lance los errores y el controlador solo los controle para pasarlos a la siguiente capa.

### Servicio
```TS	
import { Forbidden, InternalServerError, NotFound } from '@/middlewares/error_handler';

export async function someService() {
  if (someCondition){
    throw NotFound('Some message');
  }
}
```

### Controlador
```TS
export async function destroy (req: Request, res: Response, next: NextFunction): Promise<void> {
  import { someService } from '@/services/someService';

  try {
    const response = await someService();
    res.json(response)
  } catch (error: any) {
    next(error)
  }
}
```

## Instalación de Socket
Adicionalmente después de crear el servidor es posible instalar el uso de sockets mediante la librería [https://socket.io/](socket.io). 
Para ello utilizar el comando 
```bash
node-express-cli install:socket
```

Es importante que esta acción se realice antes de personalizar el archivo principal del servidor index.ts, pues reemplazará todo su contenido con la nueva configuración para soportar el socket.

## Instalación de Prettier y ESlint
La instalación de [Prettier](https://prettier.io/) y [ESlint](https://eslint.org/) se incluyen como opciones separadas para ofrecer una configuración más granular. 
Para instalar prettier: 
```bash
node-express-cli install:prettier
```
Para instalar ESlint
```bash
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

```TS
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

```bash
npm run dev
```
Si no existe el directorio build antes de ejecutar este comando, es posible que sea necesario parar y ejecutar el comando nuevamente.

### Producción

Para compilar el proyecto utilizar el comando: 
```bash
npm run build
```

Para iniciar el servidor compilado utilizar el comando:

```bash
npm start
```

