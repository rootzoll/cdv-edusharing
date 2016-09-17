import { provideRouter, RouterConfig } from '@angular/router';

import { CollectionsComponent } from './+collections/collections.component';
import { CollectionNewComponent } from './+collection-new/collection-new.component';
import { DialogInfoComponent } from './+dialog-info/dialog-info.component';
import { HomeComponent } from './+home/home.component';
import { DemoInterframecomComponent } from './+demo-interframecom/demo-interframecom.component';
import { ContentDetailComponent } from './content-detail/content-detail.component';
import { DemoEduapiComponent } from './+demo-eduapi/demo-eduapi.component';

export const routes: RouterConfig = [
  {path: 'collections', component: CollectionsComponent},
  {path: 'collection/:mode/:id', component: CollectionNewComponent},
  {path: 'dialoginfo', component: DialogInfoComponent},
  {path: '', component: HomeComponent},
  {path: 'demo-interframecom', component: DemoInterframecomComponent},
  {path: 'demo-eduapi', component: DemoEduapiComponent}
];

export const APP_ROUTER_PROVIDERS = [
  provideRouter(routes)
];