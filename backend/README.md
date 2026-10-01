# Bloom Coffee Admin Login

## Add An Admin

From the project root, run:

```sh
node backend/create-admin.js
```

Enter the admin email, then a password of at least 12 characters. Password input is hidden. The account is stored in `backend/data/admins.json` with a random salt and scrypt password hash. The password itself is not saved.

Run the command again to add another admin. The generated database is excluded from Git.

## Run The Website

```sh
node backend/server.js
```

Open [http://localhost:3000/admin.html](http://localhost:3000/admin.html). The admin login API requires this server; opening the page with Live Server alone will not authenticate accounts. Sessions use an HTTP-only cookie and expire after eight hours. Restarting the local server signs out active sessions.

Set `PORT` to use a different port. Set `ADMIN_DB_PATH` to store the account database outside the project directory.
