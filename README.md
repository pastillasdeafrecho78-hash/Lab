# Laboratorio Comandas - Sistema de Gestión

Sistema de gestión de comandas para laboratorios clínicos con múltiples sucursales, chat interno, y generación automática de resultados membretados.

## 🚀 Características Principales

- **Gestión de Comandas**: Registro, asignación automática a sucursales y seguimiento de estados
- **Chat Interno**: Comunicación en tiempo real entre sucursales y usuarios
- **Gestión de Sucursales**: Administración completa de sucursales y maquinaria
- **Sistema de Permisos**: Roles granulares con auditoría completa
- **Generación de PDFs**: Resultados membretados automáticos
- **Portal de Clientes**: Consulta de resultados en línea
- **Base de Datos Híbrida**: Local para operaciones, centralizada para clientes

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Prisma ORM
- **Base de Datos**: PostgreSQL (operaciones) + MongoDB (clientes)
- **Autenticación**: JWT + OAuth 2.0
- **Real-time**: Socket.io
- **PDF**: PDFKit
- **Deployment**: Docker + Vercel

## 📋 Prerrequisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd laboratorio-comandas
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env.local
```

Editar `.env.local` con tus configuraciones:
```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/laboratorio_comandas"
JWT_SECRET="tu_jwt_secret_muy_seguro"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu_nextauth_secret"
```

4. **Configurar base de datos**
```bash
# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# (Opcional) Abrir Prisma Studio
npm run db:studio
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🗄️ Estructura de Base de Datos

### Modelos Principales

- **Usuario**: Personal del laboratorio con roles granulares
- **Sucursal**: Ubicaciones del laboratorio
- **Maquinaria**: Equipos de laboratorio por sucursal
- **Cliente**: Pacientes del laboratorio
- **Comanda**: Órdenes de trabajo con estados
- **Resultado**: Datos de pruebas de laboratorio
- **Mensaje**: Chat interno entre usuarios
- **Auditoria**: Log completo de acciones

### Roles del Sistema

- `SUPER_ADMIN`: Acceso total
- `RESPONSABLE_SANITARIO`: Gestión completa del laboratorio
- `RESPONSABLE_SUCURSAL`: Gestión de sucursal específica
- `TECNICO_LABORATORIO`: Carga de resultados
- `RECEPCION`: Registro de comandas
- `CLIENTE`: Solo portal de resultados

## 🔐 Seguridad

- **Autenticación JWT** con expiración
- **Auditoría completa** de todas las acciones
- **Permisos granulares** por rol y sucursal
- **Encriptación** de datos sensibles
- **Validación** de entrada con Zod
- **Rate limiting** en APIs

## 📱 Funcionalidades por Implementar

### Fase 1 - MVP Core ✅
- [x] Sistema de autenticación
- [x] Gestión de comandas
- [x] Gestión de sucursales
- [x] Chat interno básico
- [x] Carga de resultados
- [x] Generación de PDF

### Fase 2 - Mejoras
- [ ] Portal de clientes
- [ ] Sistema de permisos granular
- [ ] Mejoras en UI/UX
- [ ] Optimizaciones de rendimiento

### Fase 3 - Escalabilidad
- [ ] Integración con IA
- [ ] Sistema multi-laboratorio
- [ ] APIs para integración externa
- [ ] Aplicación móvil nativa

## 🚀 Deployment

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t laboratorio-comandas .
docker run -p 3000:3000 laboratorio-comandas
```

## 📊 Monitoreo

- **Logs**: Auditoría completa en base de datos
- **Métricas**: Tiempo de respuesta, uptime
- **Alertas**: Errores críticos, accesos sospechosos

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- Email: soporte@laboratoriocomandas.com
- Documentación: [docs.laboratoriocomandas.com](https://docs.laboratoriocomandas.com)

---

**Desarrollado con ❤️ para laboratorios clínicos**