# Fitness App - Gestión de Rutinas de Entrenamiento

Aplicación web basada en microservicios para administrar rutinas de entrenamiento y el historial de actividades de los usuarios.

## 🏗 Arquitectura

```
Frontend (React) ⇄ Auth Service ⇄ PostgreSQL
                     ⇄ Exercise Service ⇄ PostgreSQL
                     ⇄ Routine Service ⇄ PostgreSQL
                     ⇄ Workout Service ⇄ PostgreSQL
```

Cada servicio mantiene su propia base de datos y se comunica con el frontend mediante solicitudes HTTP.

## 🛠 Stack tecnológico

- **Frontend**: Vite, React, TypeScript, Tailwind CSS
- **Backend**: Node.js con Express
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT

## 📁 Estructura del proyecto

```
AppGym-Microservicios/
├── frontend/                  # Cliente web
│   └── src/                   # Componentes, páginas, servicios, hooks, tipos y utilidades
└── services/
    ├── auth-service/          # Servicio de autenticación (puerto 3001)
    ├── exercise-service/      # Gestión de ejercicios y archivos (puerto 3002)
    ├── routine-service/       # Rutinas personalizadas por usuario (puerto 3003)
    └── workout-service/       # Historial y registro de entrenamientos (puerto 3004)
```

## 🔧 Microservicios

- **Auth Service**: maneja registro, inicio de sesión y emisión de tokens JWT.
- **Exercise Service**: administra el catálogo de ejercicios y los recursos multimedia asociados.
- **Routine Service**: guarda y actualiza las rutinas creadas por cada usuario.
- **Workout Service**: registra entrenamientos completados y permite consultar el historial.

## 🔄 Comunicación entre servicios

- El frontend consume directamente los endpoints de cada microservicio.
- Todos los servicios validan el token JWT emitido por el Auth Service.
- Cuando un servicio necesita datos de otro, realiza llamadas HTTP internas puntuales.

## ⚙ Configuración de desarrollo

1. Instala Node.js 18+, PostgreSQL y un gestor de paquetes como npm o yarn.
2. Crea un archivo `.env` por microservicio con `DATABASE_URL`, `PORT` y, en el caso de Auth, `JWT_SECRET`.
3. Ejecuta `npm install` en cada servicio y en el frontend.
4. Inicia cada servicio con `npm run dev` (o el script equivalente) y el frontend con `npm run dev`.

## 📌 Información adicional

- Los videos de ejercicios se almacenan localmente en `services/exercise-service/uploads/`.
- Los puertos por defecto son: Auth 3001, Exercise 3002, Routine 3003, Workout 3004 y Frontend 5173.
