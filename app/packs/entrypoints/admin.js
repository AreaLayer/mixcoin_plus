// This file is automatically compiled by Webpack, along with any other files
// present in this directory. You're encouraged to place your actual application logic in
// a relevant structure within app/javascript and only use these pack files to reference
// that code so it'll be compiled.
//
// import Rails from "@rails/ujs"
// import Turbolinks from "turbolinks"
// import * as ActiveStorage from "@rails/activestorage"
// import "channels"
//
// Rails.start()
// Turbolinks.start()
// ActiveStorage.start()

import ReactOnRails from 'react-on-rails';
import App from '../apps/admin/App';
import '../stylesheets/admin.css';

// This is how react_on_rails can see the HelloWorld in the browser.
ReactOnRails.register({
  App,
});
