import eruda from "eruda"
eruda.init()
import Vue from "vue"
import App from "./App"
import { router } from "./plugins"

new Vue({
  el: "#app",
  router,
  components: { App },
  template: "<App/>"
})