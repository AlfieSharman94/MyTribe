/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App'; // This assumes App.tsx is in the same directory as index.js
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
