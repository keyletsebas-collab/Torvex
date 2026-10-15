# Migrar a un backend propio (Supabase)

Solo hace falta si necesitas seguridad real. Hoy los roles se aplican en la pantalla; con un backend se aplican en el servidor.

## Qué ganas
- **Permisos reales:** un colaborador ya no puede saltarse un rol.
- **Cuentas propias:** correo y contraseña manejados por el proveedor, sin depender de la cuenta de Claude. Los visitantes pueden ver la página sin cuenta.
- **Historial inalterable** y borradores realmente privados.
- **Copias de seguridad** del proveedor.

## Qué arriesgas y qué cuesta
- Hay que reescribir la capa de guardado: hoy `save()` y las suscripciones de `boot()` hablan con la base compartida de la plataforma.
- Los datos actuales hay que exportarlos (panel de administración, pestaña Respaldo) y cargarlos en las tablas nuevas con un script.
- Hay que publicar la página en otro lugar (por ejemplo GitHub Pages).
- Supabase tiene un plan gratuito con límites. **Revisa los precios y las condiciones vigentes** antes de decidir.
- Los datos de menores: revisa la política de privacidad de tu escuela y dónde se almacenan los datos.

## Pasos sugeridos
1. Crear un proyecto de prueba en Supabase y ejecutar `docs/supabase-esquema.sql` (no está probado: revísalo con calma).
2. Probar las reglas de acceso con cuentas de cada rol, **antes** de cargar datos reales.
3. Reemplazar `save()`, `put()` y las suscripciones por llamadas al cliente de Supabase, conservando la lógica de torneos, tablas y marcador.
4. Importar el respaldo JSON con un script.
5. Publicar en GitHub Pages sin incluir claves privadas: solo la clave pública (`anon`) puede ir en el código.
6. Correr `npm test` y repetir las pruebas manuales con varias cuentas.

## Lo que se conserva
Formatos, tablas, desempates, marcador en vivo, estadísticas, calendario automático, diplomas y todas las pruebas de lógica.
