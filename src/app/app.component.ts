import { Component } from '@angular/core';
import { ROUTER_DIRECTIVES } from '@angular/router';
import {TranslateService, TranslatePipe, TranslateLoader, TranslateStaticLoader} from 'ng2-translate/ng2-translate';

@Component({
  moduleId: module.id,
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.css'],
  directives: [ROUTER_DIRECTIVES]
})
export class AppComponent {

    constructor(translate: TranslateService) {

        // get navigator language
        var navigatorLang = navigator.language.split('-')[0];
        navigatorLang = /(fr|en)/gi.test(navigatorLang) ? navigatorLang : null;

        // try to get locale from parent window url (if running in iFrame)
        var urlLang = null;
        try {

          // first try iFrame parent window URL if available
          if (window!=window.top) {
            console.log("getting locale parameter from iFrame");
            urlLang = AppComponent.getLocaleParamFromUrlString(JSON.stringify(window.parent.document.URL));
          }

        } catch (e) {
          console.log("ERROR on getting locale parameter from iFrame URL: "+JSON.stringify(e));
        }
        
        // determine wich lang finally to use
        // 1. url lang / 2. navigator lang / 3. default "de"
        var langToWorkWith = "en";
        if (navigatorLang!=null) langToWorkWith = navigatorLang;
        if (urlLang!=null) langToWorkWith = urlLang;
        console.log("LOCALE: running with '"+langToWorkWith+"'");
        translate.setDefaultLang('de');
        translate.use(langToWorkWith);
    }

    // getting the locale parameter from an URL string by simple parsing
    static getLocaleParamFromUrlString(urlStr:String) : String {
        if (typeof urlStr == "undefined") return null;
        var result = null;
        if (urlStr.indexOf("locale=")>0) {
          result = urlStr.substr(urlStr.indexOf("locale=")+7);
          if (result.indexOf("&")>0) result = result.substr(0,result.indexOf("&"));
          if (result.indexOf("#")>0) result = result.substr(0,result.indexOf("#"));   
          if (result.indexOf("_")>0) result = result.substr(0,result.indexOf("_"));
        }
        return result;
    }

}
