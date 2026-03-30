# api

## Overview

The `api` sub-project is a TypeScript-based RESTful API application designed to provide a robust and scalable interface for interacting with the parent project's data. Its primary role is to expose a set of endpoints that enable data exchange between the application's frontend and backend components.

## Installation

To install and run the `api` sub-project, navigate to the root project directory and execute the following commands:

```bash
cd apps/api
pnpm install
```

## Running the Application

To start the development server, run the following command:

```bash
pnpm run dev
```

This will compile the TypeScript code, watch for changes, and start the server. You can then access the API endpoints by navigating to `http://localhost:3000` in your web browser or using a tool like `curl` or Postman.

## Running the Application in Production

To build the application for production, run the following command:

```bash
pnpm run build
```

This will compile the TypeScript code and generate a production-ready `dist` directory. You can then start the application using the following command:

```bash
pnpm run start
```

## Linting and Code Quality

To ensure code quality and adherence to the project's coding standards, run the following command:

```bash
pnpm run lint
```

This will execute the ESLint linter and report any issues or warnings.

## Core Dependencies

The `api` sub-project relies on the following core dependencies:

* `typescript`: The TypeScript compiler and runtime environment.
* `express`: A popular Node.js web framework for building RESTful APIs.
* `@types/express`: Type definitions for the Express.js framework.
* `@types/node`: Type definitions for the Node.js runtime environment.

## Contributing

Contributions to the `api` sub-project are welcome. Please ensure that any changes are thoroughly tested and adhere to the project's coding standards. To contribute, fork the repository, make your changes, and submit a pull request.

## License

The `api` sub-project is licensed under the MIT License. See the `LICENSE` file for details.