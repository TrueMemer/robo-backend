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

---

`GET /profile/addBalanceHistory` - возвращает список транзакций пополнения для текущего пользователяю

---

`GET /profile/getDeposits` - возвращает список депозитов пользователя.

---

`POST /payment/crypto/createPayment` - создает транзацию пополнения с заданными параметрами для текущего пользователя.

Пример тела:

```json
{ "currency": "litecoin", "amount_usd": 1 }
```

Пример ответа:

```json
{
    "user_id": 1,
    "currency": "litecoin",
    "amount_usd": 1,
    "amount_currency": 0.0096237, // эквивалент указанной суммы в указанной криптовалюте
    "dateCreated": "2019-06-04T16:39:24.793Z",
    "receive_address": "2NEoQoUsgLinccpJdRrh6E1roCkTeNc5UYm", // адрес, куда нужно переводить
    "type": 1,
    "dateDone": null,
    "id": "e6efc94f-15c0-4f0b-bcf2-ab613b39cc9a", // уникальный ид транзации
    "status": 2 // статус сделки, возможные варианты смотри в модели CryptoTransaction
}
```

---

`POST /payment/crypto/checkPayment` - проверка статуса транзакции пополнения.

Пример:

```json
{
	"uuid": "e6efc94f-15c0-4f0b-bcf2-ab613b39cc9a"
}
```

Ответ:

```json
{
    "id": "e6efc94f-15c0-4f0b-bcf2-ab613b39cc9a",
    "user_id": 1,
    "currency": "litecoin_testnet",
    "type": 1,
    "amount_usd": 1,
    "amount_currency": 0.0096237,
    "receive_address": "2NEoQoUsgLinccpJdRrh6E1roCkTeNc5UYm",
    "status": 0, // сделка прошла успешно
    "dateCreated": "2019-06-04T16:39:24.793Z",
    "dateDone": "2019-06-04T16:40:08.613Z" // дата закрытия
}
```

`POST /payment/crypto/cancelPendingPayment` - отмена ожидающей транзакции пополнения.

Пример:

```json
{ "uuid": "5cdec60c-12c8-4ea2-b98a-2c20d1c4ebec" } // => 200
```