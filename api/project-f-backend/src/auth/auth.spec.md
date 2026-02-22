# Authentication Module

Goal: implement OTP-based auth with email + session tokens.

## Tables
OtpVerification
- id uuid primary key
- email string
- purpose login | signup
- code string
- expiresAt
- createdAt
- updatedAt

UserSessionTokens
- id uuid
- userId string FK to User.id
- token string
- expiresAt
- createdAt
- updatedAt

User
- id uuid
- email string
- createdAt
- updatedAt

## Base Interfaces
```typescript
export interface IHandlerBase<TRequest, TContext> {
  validateRequest(request: TRequest, context: TContext): Promise<TContext>;
  loadData(request: TRequest, context: TContext): Promise<TContext>;
  validateLoadedData(request: TRequest, context: TContext): Promise<TContext>;
  process(request: TRequest, context: TContext): Promise<TContext>;
  sideEffects(request: TRequest, context: TContext): Promise<TContext>;
}
```

## Services
MockEmailService & EmailServiceAbstraction
- abstracts away email services
- for now we'll have a generic abstraction 
- and 1 mock implementation that does nothing but returns success
```ts
abstract class EmailServiceAbstraction {
  send(options: any): Promise<any>
}
```
- Move this into its own module

## API Endpoints
### POST /auth/otp/send
#### Request
```typescript
export interface SendOtpRequest {
  email: string;
  purpose: "login" | "signup";
}
```
#### Handler logic
- implement IHandlerBase<TRequest, TContext>
- validateRequest
  - purpose should be login or signup
  - email is required
- loadData
  - load data from the database
    - user based on email
- validateLoadedData
  - if purpose is signup and user is not null, return bad request User already exists
  - if purpose is login and user is null, return bad request User does not exist
- process
  - generate otp
  - save otp in database
    - Save to OtpVerification table
      - code
      - email
      - purpose
      - expiresAt (e.g., now + 5 minutes)
  - send otp to user (via email, call EmailServiceAbstraction)
- sideEffects
  - none

### POST /auth/otp/verify
#### Request
```typescript
export interface VerifyOtpRequest {
  email: string;
  code: string;
  purpose: string;
}
```
#### Handler logic
- implement IHandlerBase<TRequest, TContext>
- validateRequest
  - email is required
  - code is required
  - purpose is required, should be "login" or "signup"
- loadData
  - load data from the database
    - SELECT * FROM OtpVerification WHERE purpose = passedPurpose and code = passedCode
- validateLoadedData
  - check if otp verification is not null, if null bad request Code is invalid
  - check if otp is expired, if expired return bad request Code expired
- process
  - check if purpose is signup, if true
    - create a new user, load user
  - if user is login
    - load user
  - generate secure token
  - create new UserSessionToken record
    - userId
    - token
    - expiresAt (e.g., now + 30 days)
  - return secure token
- sideEffects
  - none
#### Controller 
- call handler, return token
- set HTTP-only cookie

## Cookie Settings
- name: `session`
- httpOnly: true
- secure: true in production, false in local dev
- sameSite: `lax`
- path: `/`
- maxAge: 30 days (match UserSessionTokens.expiresAt)
- domain: omit in local dev, set explicitly in production if needed

### GET /auth/me
Request
- requires cookie set from POST /auth/otp/verify
Response
- returns User row using verified data from the Route guard

## Create a guard
Goal: protect routes and load the current user from the session token.
- Check if cookie exists; if not, return 403.
- Check if token is valid (not expired, exists):
  - SELECT * FROM UserSessionTokens WHERE token = passedString
- Load the user:
  - SELECT * FROM User WHERE id = token.userId
- Attach user to request context for downstream handlers/controllers.

## Implementation Plan (AI Agent)
### 1) Prisma schema
- Add Prisma to the NestJS project.
- Define models:
  - `User` (id uuid, email unique, timestamps)
  - `OtpVerification` (id uuid, email, purpose enum, code, expiresAt, timestamps)
  - `UserSessionToken` (id uuid, userId FK, token, expiresAt, timestamps)
- Add index on `OtpVerification(email, purpose, code)` and `UserSessionToken(token)`.

### 2) Docker Compose (PostgreSQL)
- Update `docker-compose.yml` to add `postgres` service.
- Expose port `5432` to host.
- Provide env vars: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
- Add a volume for persistence.

### 3) Environment
- Add `.env` for `DATABASE_URL` (Prisma) and app config.
- Wire NestJS `ConfigModule` to load env.

### 4) Start database
- Run `docker compose up -d postgres`.
- Confirm healthy with `docker compose ps` and `psql` or logs.

### 5) Migrations
- Initialize Prisma and run `prisma migrate dev`.
- Generate Prisma Client.

### 6) Implement auth module
- Create `auth` vertical slice (module, controller, handlers, dto, services).
- Implement OTP send/verify handlers following this spec.
- Implement EmailServiceAbstraction and MockEmailService.
- Implement AuthGuard that:
  - reads cookie
  - validates token exists + not expired
  - loads user and attaches to request.

### 7) Wire endpoints
- POST `/auth/otp/send`
- POST `/auth/otp/verify`
- GET `/auth/me`
- Add Swagger docs + examples.

### 8) Test locally
- Smoke test OTP send/verify flow.
- Verify cookie is set and `/auth/me` returns user.
