# robo-backend

Использует базу данных PostgreSQL.

Название базы данных - `robofxtrading`. Ее нужно создать до запуска сервера.

Сначала нужно прописать - `npm i`.
Чтобы создать администратора - `npm run migration:run`. Логин и пароль - `admin`.
Запустить для разработки - `npm start`. Таблицы создадутся сами при первом запуске.

## Методы API

При каждом новом запросе на любой метод в заголовке Authorization ответа возвращается новый токен.

`POST /auth/login` - ожидает данные пользователя и возвращает токен. Токен действует 1 час.

Пример:

```json
{ "username": "admin", "password": "admin" } // => eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiO...
```

---

`POST /auth/change-password` - меняет пароль пользователя.

Пример:

```json
{ "oldPassword": "test", "newPassword": "test1" } // => 204
```

---

`GET /user/` - возвращает список всех пользователей. Только для роли ADMIN.

---

`POST /user/` - регистрирует нового пользователя. Токен не требуется. Отправляет подтверждение на почту.

```json
{ "username": "test", "password": "test", "email": "test@mail.ru" } // => 201
```

---

`GET /user/:id` - возвращает пользователя по ID. Только для роли ADMIN.

---

`PATCH /user/:id` - изменяет пользователя по ID. Только для роли ADMIN.

Пример:

```json
{ "username": "changed", "role": "ADMIN" } // => 204
```

---

`DELETE /user/:id` - удаляет пользователя по ID. Только для роли ADMIN.

---

`GET /user/confirmation` - метод который используется для подтверждения почты.

---

`GET /profile` - возвращает профиль текущего пользователя.