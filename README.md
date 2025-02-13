# Medplum Chat App 🩺

An example for a live chat mobile application built with Expo / React Native, using [Medplum](https://www.medplum.com/) as the backend EHR system. This project demonstrates how to build a FHIR-native app for real-time communications between patients and providers.

## Demo video
<div align="center">
  <video src="https://github.com/user-attachments/assets/50dc2a07-e350-4e6e-be2b-89b9e129ac4b" />
</div>

## Features

### OAuth2 Authentication with Medplum
- Proper login/logout flow with secure state management
- Supports both Patient and Practitioner user roles with role-specific features
- Works on both web and native platforms

### Secure Live Chat System
The app implements a secure live chat system following Medplum's ["Organizing Communications Using Threads"](https://www.medplum.com/docs/communications/organizing-communications) architecture with the following features:

- **Chat**
  - Send chat messages by creating new `Communication` FHIR resources
  - Real-time message updates using Medplum WebSocket `Subscription`
  - Auto-update of message status: sent, received, read, directly on `Communication` FHIR resource
  - Message deletion

- **Media Support**
  - Image and video attachments
  - Performance optimizations for media display

- **Thread Management**
  - View all chat threads
  - Create new threads (for patients)
  - Real-time thread updates

- **Push Notifications**
  - Push notifications for new messages using a [Medplum Bot](https://www.medplum.com/docs/bots/bot-basics) (similar to a AWS Lambda function)
  - Deep linking to related thread when tapping a notification

- **UI/UX Features**
  - Native look and feel
  - Dark mode / theme support
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

[Medplum](https://www.medplum.com/) is an open-source, API-first, FHIR-native EHR. Medplum makes it easy to build healthcare apps quickly with less code. Medplum supports self-hosting, and provides a hosted service. Medplum customers benefit from interoperability and compliance built into the platform, including FHIR, HIPAA, and others.

## Getting Started

### Prerequisites
- [Expo CLI](https://docs.expo.dev/)
- npm or yarn
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

Install dependencies:

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

### Configuring Push Notifications

The app uses [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/) to notify users of new messages. To set this up you need to create a [Medplum Bot](https://www.medplum.com/docs/bots/bot-basics) and a Subscription to trigger the bot:

1. Create a new Bot in your Medplum project:
   1. Go to the [Bot](https://app.medplum.com/Bot) page in Medplum admin
   2. Click "New..."
   3. Give it a name (e.g., "Chat Notifications Bot")
   4. Copy the bot's ID from the URL after creation

2. Deploy the notification bot code:
   1. The bot code is in `bots/notification-bot.ts`
   2. Copy the code and paste it into the bot's Editor in Medplum admin
   3. Click "Save"
   4. Click "Deploy"

3. Create a Subscription to trigger the bot:
   1. Go to the [Subscription](https://app.medplum.com/Subscription) page
   2. Click "New..."
   3. Configure the subscription (fill in the bot ID you created in the previous step):
      ```
      Status: Active
      Reason: To send push notifications for new messages
      Criteria: Communication?part-of:missing=false
      Channel Type: rest-hook
      Channel Endpoint: Bot/<YOUR_BOT_ID_HERE>
      Channel Payload: application/fhir+json
      ```
   4. Click "OK" to save

4. The app will automatically request notification permissions and store the Expo push token in the user's profile when they log in.

Push notifications do not work on the web, nor emulators, only on physical devices. To test push notifications, do the following:

1. [Get push notifications credentials for development builds](https://docs.expo.dev/push-notifications/push-notifications-setup/#get-credentials-for-development-builds)
2. [Build the app with eas](https://docs.expo.dev/build/setup/)
3. Run the app on a physical device by reading the QR code from the terminal

### Configuring Access Policies (for production)

The app implements message deletion functionality, which requires proper access control in production. You need to set up [Access Policies](https://www.medplum.com/docs/access/access-policies) in Medplum to ensure patients can only read/update/delete their own messages.

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

### Known issues

- Video playback is not supported on web due to cross-origin restrictions on browsers. To test video playback, run the app on an iOS or Android device. It's possible to solve this issue by hosting the video files on a server that supports CORS, instead of Medplum's storage.

## Project Structure

- `/app` - Main application code using Expo Router for file-based routing
- `/components` - Reusable React components
- `/components/ui` - gluestack-ui v2 components
- `/contexts` - Global shared state and business logic, real-time chat logic is here
- `/hooks` - React hooks for business logic, headless chat hooks are here
- `/models` - Business logic models
- `/utils` - Utility functions
- `/bots` - Medplum bots (push notification code)
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
