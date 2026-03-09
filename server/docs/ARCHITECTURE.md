# Server Architecture

This document describes the folder structure and architectural patterns used in the NeuraMemory-AI server.

## Folder Structure

The server's source code is organized into several key directories under `src/`:

- **config/**: Contains application configuration and environment variable validation.
- **controllers/**: Responsible for handling incoming HTTP requests, parsing parameters, and returning responses.
- **services/**: Contains the core business logic of the application. Services are independent of the transport layer (e.g., HTTP).
- **repositories/**: Handles all data access logic, interfacing directly with databases like MongoDB and Qdrant.
- **middleware/**: Contains reusable logic that runs before or after request handlers, such as authentication, logging, and error handling.
- **types/**: Defines TypeScript interfaces and types used throughout the application.
- **utils/**: Contains generic utility functions.
- **lib/**: Houses singleton clients and wrappers for external services (e.g., MongoDB, Qdrant, OpenRouter).

## Data Flow

1.  **Request**: An incoming request is first processed by the **middleware** (e.g., authentication).
2.  **Controller**: The request is then routed to a **controller** which validates the input.
3.  **Service**: The controller calls a **service** to perform the requested business logic.
4.  **Repository**: The service may call one or more **repositories** to fetch or persist data.
5.  **Response**: The service returns its result to the controller, which then sends the appropriate HTTP response.
