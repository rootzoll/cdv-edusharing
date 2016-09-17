import {Component, OnInit} from '@angular/core';
import {GwtInterfaceService, GwtEventListener} from '.././gwt-interface.service';
import {EduApiService} from '.././edu-api.service';
import * as EduData from '.././edu-api.data';

@Component({
  selector: 'app-demo-eduapi',
  templateUrl: 'app/+demo-eduapi/demo-eduapi.component.html',
  styleUrls: ['app/+demo-eduapi/demo-eduapi.component.css'],
  providers: [GwtInterfaceService, EduApiService]
})
export class DemoEduapiComponent implements OnInit, GwtEventListener {

    private initData:string = "please to init first";
    private profileData:string = "-";
    private createCollectionName:string = "";
    private createCollectionData:string = "-";
    private rootCollectionData:string = "-";
    private getCollectionsSelect:number=0;

    // inject services
    constructor(
        public gwtInterface:GwtInterfaceService,
        public eduApiService:EduApiService) {
        if (this.eduApiService.setUpIsWorking()) this.initData = "OK API IS READY (already done from outside)"
    }

    onGwtEvent(command:string, message:any) : void {
        alert('CollectionsComponent received event from GWT: command('+command+') message('+JSON.stringify(message)+')');
    }

    initApi() : void {
        // if not already set on a higher level - init EduApiService Dev-Style
        if (!this.eduApiService.setUpIsWorking()) this.eduApiService.oAuthInitWithJSessionFlow(EduApiService.INIT_WITH_USERPASSPROMT_FALLBACK).subscribe(
                isWorking => {
                if (!isWorking) {
                    this.initData = "LOGIN FAILED - please reload site to make examples work";
                } else {
                    this.initData = "OK API IS READY";
                }
            }
        );
    }

    getOwnProfile() : void {
        this.profileData = "... loading ...";
        this.eduApiService.getOwnProfile().subscribe(result => {
            this.profileData = JSON.stringify(result);
        }, error => {
            this.profileData = "FAIL: "+JSON.stringify(error);
        });
    }

    getRootCollections() : void {
        this.rootCollectionData = "... loading ...";
        this.eduApiService.getCollectionContent(this.getCollectionsSelect).subscribe( result => {
            this.rootCollectionData = JSON.stringify(result);
        }, error => {
            this.rootCollectionData = "FAIL: "+JSON.stringify(error);
        });
    }

    createCollection() : void {
        this.createCollectionData = "... loading ...";
        this.eduApiService.createCollection(this.createCollectionName).subscribe( result => {
            this.createCollectionData = JSON.stringify(result);
        }, error => {
            this.createCollectionData = "FAIL: "+JSON.stringify(error);
        });
    }

    ngOnInit() {
        this.gwtInterface.addListenerOfGwtEvents(this);
    }

}
