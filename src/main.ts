import { bootstrap } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { AppComponent } from './app/';
import { EduApiService } from './app/edu-api.service';
import { APP_ROUTER_PROVIDERS } from './app/app.routes';
import { HTTP_PROVIDERS, Http } from '@angular/http';
import {
    TRANSLATE_PROVIDERS, 
    TranslateService, 
    TranslatePipe, 
    TranslateLoader, 
    TranslateStaticLoader
  } from 'ng2-translate/ng2-translate';

/* TODO enable on release
if (environment.production) {
  enableProdMode();
}
*/

bootstrap(AppComponent,[
  APP_ROUTER_PROVIDERS, HTTP_PROVIDERS, 
  HTTP_PROVIDERS,
  { 
    provide: TranslateLoader,
    useFactory: (http: Http) => new TranslateStaticLoader(http, 'app/i18n', '.json'),
    deps: [Http]
  },
  TranslateService,
  EduApiService
]).catch(err => console.error(err));