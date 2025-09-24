# Fitness App - Gestión de Rutinas de Entrenamiento

Una aplicación web completa para la gestión de rutinas de entrenamiento implementada con arquitectura de microservicios.

## 🏗 Arquitectura

```
Frontend (React) ←→ Microservicios
                    ├── Auth Service (Puerto 3001)
                    ├── Exercise Service (Puerto 3002)
                    ├── Routine Service (Puerto 3003)
                    └── Workout Service (Puerto 3004)
```

Cada microservicio tendrá su propia base de datos PostgreSQL, gestionada localmente (por ejemplo, con pgAdmin).

## 🛠 Tecnologías

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT
- **Contenedorización**: Sin Docker (desarrollo local directo)

## 📁 Estructura del Proyecto

```
fitness-app/
├── frontend/                 # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/            # Páginas principales
│   │   ├── services/         # Llamadas a APIs de microservicios
│   │   ├── hooks/            # Custom hooks
│   │   ├── types/            # Tipos TypeScript
│   │   └── utils/            # Utilidades
├── services/
│   ├── auth-service/         # Puerto 3001
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env
│   ├── exercise-service/     # Puerto 3002
│   │   ├── src/
│   │   ├── uploads/          # Videos de ejercicios
│   │   ├── package.json
│   │   └── .env
│   ├── routine-service/      # Puerto 3003
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env
│   └── workout-service/      # Puerto 3004
│       ├── src/
│       ├── package.json
│       └── .env
```

## 🎯 Funcionalidades por Rol

### 👑 Administrador
- ✅ Crear ejercicios con nombre, alias (sinónimos) y videos demostrativos de la técnica correcta.
- ✅ Gestionar la biblioteca de ejercicios (CRUD).
- ✅ Subir videos de técnica correcta para los ejercicios.

### 👤 Usuario
- ✅ Registro e inicio de sesión con username y contraseña (autenticación básica con JWT).
- ✅ Ver la lista de rutinas que ha creado en su pantalla principal.
- ✅ Crear rutinas personalizadas: buscar ejercicios por nombre o alias, añadirlos a la rutina con campos de series, rango de repeticiones, técnica (dropset, myo-reps, fallo, etc.).
- ✅ Editar rutinas existentes.
- ✅ Iniciar una rutina: registrar pesos y repeticiones de cada serie, controlar descansos con un temporizador integrado y guardar el avance en tiempo real.
- ✅ Al terminar, guardar el entrenamiento en su historial.
- ✅ Ver un historial de entrenamientos pasados con todos los datos registrados.

## 🔧 Microservicios

### 1. Auth Service (Puerto 3001)
*Responsabilidades:*
- Registro y login de usuarios.
- Gestión de roles (admin/usuario).
- Generación y validación de JWT.
- Middleware de autenticación para proteger rutas.

*Endpoints principales:*
- `POST /api/auth/register`: Registrar un nuevo usuario.
- `POST /api/auth/login`: Iniciar sesión y obtener un JWT.
- `GET /api/auth/profile`: Obtener el perfil del usuario autenticado.
- `POST /api/auth/verify-token`: Verificar la validez de un JWT.

### 2. Exercise Service (Puerto 3002)
*Responsabilidades:*
- CRUD (Crear, Leer, Actualizar, Eliminar) de ejercicios (solo accesible por administradores).
- Manejo de alias/sinónimos para cada ejercicio.
- Subida y servicio de videos demostrativos de ejercicios.
- Funcionalidad de búsqueda de ejercicios por nombre o alias.

*Endpoints principales:*
- `GET /api/exercises/`: Buscar y listar ejercicios.
- `POST /api/exercises/`: Crear un nuevo ejercicio (admin).
- `GET /api/exercises/:id`: Obtener detalles de un ejercicio específico.
- `PUT /api/exercises/:id`: Actualizar un ejercicio existente (admin).
- `DELETE /api/exercises/:id`: Eliminar un ejercicio (admin).
- `POST /api/exercises/:id/video`: Subir un video para un ejercicio (admin).
- `GET /api/exercises/:id/video`: Obtener el video de un ejercicio.

### 3. Routine Service (Puerto 3003)
*Responsabilidades:*
- CRUD de rutinas por usuario.
- Asociación de ejercicios con parámetros específicos de la rutina (series, rango de repeticiones, técnica).
- Validación de propiedad de las rutinas (un usuario solo puede gestionar sus propias rutinas).

*Endpoints principales:*
- `GET /api/routines/`: Obtener las rutinas del usuario autenticado.
- `POST /api/routines/`: Crear una nueva rutina.
- `GET /api/routines/:id`: Obtener detalles de una rutina específica.
- `PUT /api/routines/:id`: Editar una rutina existente.
- `DELETE /api/routines/:id`: Eliminar una rutina.

### 4. Workout Service (Puerto 3004)
*Responsabilidades:*
- Registro de entrenamientos realizados por los usuarios.
- Mantenimiento del historial de entrenamientos.
- Funcionalidad para consultar el historial de entrenamientos.

*Endpoints principales:*
- `POST /api/workouts/`: Guardar un entrenamiento completado.
- `GET /api/workouts/`: Obtener el historial de entrenamientos del usuario autenticado.
- `GET /api/workouts/:id`: Obtener detalles de un entrenamiento específico del historial.
- `GET /api/workouts/stats`: Obtener estadísticas básicas del usuario basadas en sus entrenamientos.

## 🚀 Plan de Implementación

### Fase 1: Infraestructura Base
- [x] Configurar la estructura de carpetas del proyecto (`fitness-app/`, `frontend/`, `services/`, etc.).
- [x] Configurar PostgreSQL y crear bases de datos separadas para cada microservicio.
- [x] Inicializar el proyecto de Vite + React + TypeScript en `frontend/`.
- [x] Inicializar cada microservicio con Node.js y Express, incluyendo sus `package.json` y archivos `.env`.

### Fase 2: Auth Service
- [x] Implementar modelos de usuario y lógica de autenticación.
- [x] Desarrollar los endpoints de registro y login con generación de JWT.
- [x] Crear el middleware de autenticación para validar JWTs.

### Fase 3: Exercise Service
- [x] Implementar el CRUD de ejercicios, asegurando que solo los administradores puedan crearlos, editarlos o eliminarlos.
- [x] Desarrollar la lógica para manejar alias y la funcionalidad de búsqueda.
- [x] Implementar la subida y el servicio de videos demostrativos.

### Fase 4: Routine Service
- [x] Implementar el CRUD de rutinas, asegurando la propiedad del usuario.
- [x] Desarrollar la lógica para asociar ejercicios con parámetros específicos de la rutina.

### Fase 5: Workout Service
- [x] Implementar la funcionalidad para registrar entrenamientos completados.
- [x] Desarrollar los endpoints para consultar el historial de entrenamientos y obtener detalles específicos.
- [x] Añadir la lógica para estadísticas básicas.

### Fase 6: Frontend
- [x] Desarrollar las páginas de autenticación (registro e inicio de sesión).
- [x] Crear el dashboard principal que muestre las rutinas del usuario.
- [x] Implementar la interfaz para crear y editar rutinas.
- [x] Desarrollar la pantalla de entrenamiento en vivo con temporizador y registro de series.
- [x] Crear la vista del historial de entrenamientos.

### Fase 7: Integración y Refinamiento
- [ ] Establecer la comunicación adecuada entre los microservicios (llamadas HTTP internas).
- [ ] Implementar un manejo de errores robusto en todos los servicios y el frontend.
- [ ] Añadir validaciones cruzadas donde sea necesario.
- [ ] Realizar mejoras de UI/UX y pulir la interfaz de usuario.

## 🔄 Comunicación Entre Servicios

1. **Frontend → Servicios**: El frontend realizará solicitudes HTTP directas a los endpoints de cada microservicio.
2. **Autenticación**: El JWT obtenido del Auth Service será enviado en los encabezados de las solicitudes (Bearer Token) a los demás microservicios, donde será validado por un middleware.
3. **Validación entre servicios**: Cuando un microservicio necesite información o validación de otro (ej., Routine Service necesita validar un ejercicio con Exercise Service), realizará llamadas HTTP internas.
4. **Sin API Gateway inicialmente**: Para simplificar el desarrollo inicial, el frontend se comunicará directamente con cada microservicio.

## ⚙ Configuración de Desarrollo

### Prerrequisitos
- Node.js (versión 18 o superior)
- PostgreSQL
- npm o yarn (gestor de paquetes de Node.js)

### Variables de Entorno
Cada microservicio necesitará su propio archivo `.env` en su directorio raíz.

```dotenv
# Ejemplo para cada servicio
DATABASE_URL="postgresql://user:password@localhost:5432/nombre_de_la_base_de_datos"
JWT_SECRET="tu-clave-secreta-muy-segura" # Solo para Auth Service
PORT=3001 # Puerto específico para cada servicio
```

### Puertos por Defecto
- **Auth Service**: 3001
- **Exercise Service**: 3002
- **Routine Service**: 3003
- **Workout Service**: 3004
- **Frontend**: 5173 (puerto por defecto de Vite)

## 📝 Notas Técnicas

- Cada microservicio será completamente independiente, con su propia lógica de negocio y base de datos.
- Las bases de datos serán separadas por servicio para mantener la independencia y escalabilidad.
- La autenticación JWT será compartida y validada por todos los servicios que requieran protección.
- Los videos de ejercicios se almacenarán localmente en el Exercise Service (en la carpeta `uploads/`).
- El frontend se comunicará directamente con cada microservicio, sin un API Gateway inicial para simplificar el setup.
- No se utilizará Docker para simplificar el desarrollo local y la configuración inicial.

## 🎨 Características de UI/UX

- Diseño responsive y moderno utilizando Tailwind CSS.
- Interfaz intuitiva y fácil de usar para la creación y gestión de rutinas.
- Temporizador visual claro durante los entrenamientos.
- Reproducción de videos integrada directamente en la interfaz de entrenamiento.
- Historial visual de entrenamientos con posibles gráficos de progreso.
- Funcionalidad de búsqueda rápida y eficiente de ejercicios.
- Soporte y gestión de técnicas de entrenamiento especiales (dropsets, myo-reps, etc.).

## 🗄️ Esquema de Base de Datos

### Auth Service Database (fitness_auth_db)
```sql
-- Tabla de usuarios
users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user', -- 'user' o 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Exercise Service Database (fitness_exercise_db)
```sql
-- Tabla de ejercicios
exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  video_path VARCHAR(255),
  created_by INTEGER NOT NULL, -- ID del admin que lo creó
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Tabla de alias para ejercicios
exercise_aliases (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
  alias VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Routine Service Database (fitness_routine_db)
```sql
-- Tabla de rutinas
routines (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL, -- ID del usuario propietario
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Tabla de ejercicios en rutinas
routine_exercises (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL, -- ID del ejercicio (referencia al Exercise Service)
  sets INTEGER NOT NULL,
  rep_range_min INTEGER,
  rep_range_max INTEGER,
  technique VARCHAR(50), -- 'normal', 'dropset', 'myo-reps', 'failure', etc.
  rest_time INTEGER, -- tiempo de descanso en segundos
  order_in_routine INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Workout Service Database (fitness_workout_db)
```sql
-- Tabla de entrenamientos
workouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL, -- ID del usuario
  routine_id INTEGER NOT NULL, -- ID de la rutina utilizada
  routine_name VARCHAR(100) NOT NULL, -- Nombre de la rutina (snapshot)
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration INTEGER, -- duración en segundos
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- Tabla de sets realizados en entrenamientos
workout_sets (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL, -- ID del ejercicio
  exercise_name VARCHAR(100) NOT NULL, -- Nombre del ejercicio (snapshot)
  set_number INTEGER NOT NULL,
  weight DECIMAL(5,2), -- peso utilizado
  reps INTEGER NOT NULL, -- repeticiones realizadas
  technique VARCHAR(50), -- técnica utilizada
  rest_time INTEGER, -- tiempo de descanso real en segundos
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## 🚦 Estados de Desarrollo

### ✅ Completado
- [x] Fase 1: Infraestructura Base
- [x] Fase 2: Auth Service
- [x] Fase 3: Exercise Service
- [x] Fase 4: Routine Service
- [x] Fase 5: Workout Service
- [x] Fase 6: Frontend

### 🔄 En Progreso
- [ ] Fase 7: Integración y Refinamiento

---

**Última actualización**: Enero 2025
**Versión**: 1.0.0
**Estado**: Planificación Inicial