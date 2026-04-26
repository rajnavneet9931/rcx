# Jeecom Docker Setup

Run from this `it-company` folder:

```bash
docker compose up -d --build
```

Open:

```text
http://localhost
```

Admin page:

```text
http://localhost/admin
```

Seed products/admin data after containers are running:

```bash
docker compose exec backend npm run seed
```

Useful commands:

```bash
docker compose ps
docker compose logs -f backend
docker compose down
```

Delete MongoDB data too:

```bash
docker compose down -v
```
