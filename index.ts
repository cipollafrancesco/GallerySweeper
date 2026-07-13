import { registerRootComponent } from 'expo';

import App from './App';
// Imported for its side effect: TaskManager.defineTask() must run unconditionally
// at module load, before registerRootComponent, because iOS can launch the app
// headlessly specifically to run this task — see services/duplicates/backgroundScan.ts.
import './services/duplicates/backgroundScan';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
