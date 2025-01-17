# Medplum Chat App 🩺

An example for a live chat mobile application built with Expo / React Native, using [Medplum](https://www.medplum.com/) as the backend EHR system. This project demonstrates how to build a FHIR-native app for real-time communications between patients and providers.

## Features

### OAuth2 Authentication with Medplum
- Proper login/logout flow with secure state management
- Supports both Patient and Practitioner user roles with role-specific features
- Works on both web and native platforms

### Secure Live Chat System
The app implements a secure live chat system following Medplum's ["Organizing Communications Using Threads"](https://www.medplum.com/docs/communications/organizing-communications) architecture with the following features:

- **Chat**
  - Send chat messages by creating new `Communication` resources
  - Real-time message updates using Medplum WebSocket `Subscription` resource
  - Auto-update of message status: sent, received, read

- **Media Support**
  - Image and video attachments
  - Performance optimizations for media display

- **Thread Management**
  - View all chat threads
  - Create new threads (for patients)
  - Real-time thread updates

- **UI/UX Features**
  - Native look and feel
  - Auto-scroll to bottom after new messages
  - Loading states and indicators
  - Safe area handling
  - Avatar loading and display

### UI components

- Built using [gluestack-ui v2](https://gluestack.io/) components
- Tailwind CSS for styling
- Native-feeling animations and transitions

### Headless hooks

All communication with Medplum is done through headless hooks and the `ChatContext` provider. If you want to build your own chat app, you can use the same hooks from this project. Check out the files in the `/hooks` directory and the `ChatContext` in the `/contexts` directory.

### About Medplum

[Medplum](https://www.medplum.com/) is an open-source, API-first EHR. Medplum makes it easy to build healthcare apps quickly with less code. Medplum supports self-hosting, and provides a hosted service.

## Getting Started

### Prerequisites
- [Expo CLI](https://docs.expo.dev/)
- npm or yarn
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. Install dependencies:

    ```bash
    npm install
    ```

### Running the App

Start the development server:

```bash
npm start
```

This will open the Expo CLI where you can choose to run the app on:
- iOS Simulator
- Android Emulator
- Web browser
- Physical device using Expo Go

NOTE: Login will not work yet, because Medplum's OAuth2 is not set. See the next section.

### Configuring Medplum OAuth2

1. Create a Medplum account and a project (in case you don't have one yet): https://app.medplum.com/register

2. Inside your Medplum project, [invite a new Patient user](https://app.medplum.com/admin/invite). Use a different email address here, because that will be your test Patient user.

3. Also, [invite a new Practitioner user](https://app.medplum.com/admin/invite). Use a different email address here, because that will be your test Practitioner user.

4. Create two Medplum Client Applications and get their client IDs:

    1. As a Medplum project admin, go to [Client Applications](https://app.medplum.com/ClientApplication) admin page
    2. Create two new client applications, one for web and one for native.
    3. Set the Redirect URI to `http://localhost:8081` for the web client and something like `exp://192.168.???.???:8081` for the native client.
        - Run `npm start`, run the app on your device with Expo Go, and check the "Redirect URL: ..." log message in the terminal to get the IP address to use.
    4. After creating the two new client applications, copy the client ID from both.

5. Copy the `.env.local.example` file to `.env.local`

    ```bash
    cp .env.local.example .env.local
    ```

6. Fill in the values in the `.env.local` file:

    ```bash
    EXPO_PUBLIC_MEDPLUM_WEB_CLIENT_ID=your_web_client_id
    EXPO_PUBLIC_MEDPLUM_NATIVE_CLIENT_ID=your_native_client_id
    ```

### Testing

Run the test suite:

```bash
npm test
```

The project uses Jest and React Native Testing Library for testing. Test files are located in the `__tests__` directory.

### Development Setup

The project uses ESLint, Prettier, and Husky for code quality and consistency. Install Husky pre-commit hooks:

```bash
npm run prepare
```

## Project Structure

- `/app` - Main application code using Expo Router for file-based routing
- `/components` - Reusable React components
- `/components/ui` - gluestack-ui v2 components
- `/contexts` - Global shared state and business logic, real-time chat logic is here
- `/hooks` - React hooks for business logic, headless chat hooks are here
- `/models` - Business logic models
- `/utils` - Utility functions
- `/__tests__` - Test files

All original components from gluestack-ui v2 are kept as-is under the `components/ui` directory, but additional components are added to the same directory to support the app's requirements. Domain-specific components are at `components` directory.

## Updating gluestack-ui

gluestack-ui v2 components are kept as-is in the `/components/ui` directory. To update them, run the following command:

```bash
npx gluestack-ui@latest add --all
```

## License

This project is licensed under the MIT License - see the `LICENSE.txt` file for details.

## Commercial Support

[![alt text](https://avatars2.githubusercontent.com/u/5529080?s=80&v=4 "Vinta Logo")](https://www.vintasoftware.com/)

This is an open-source project maintained by [Vinta Software](https://www.vinta.com.br/). We are always looking for exciting work! If you need any commercial support, feel free to get in touch: contact@vinta.com.br
