import { Component, OnInit } from '@angular/core';
import {GwtInterfaceService, GwtEventListener} from '.././gwt-interface.service';

@Component({
    selector: 'app-demo-interframecom',
    templateUrl: 'app/+demo-interframecom/demo-interframecom.component.html',
    styleUrls: ['app/+demo-interframecom/demo-interframecom.component.css'],
    providers: [GwtInterfaceService]
})
export class DemoInterframecomComponent implements OnInit {

    isRunningInFrame : boolean;

    // inject services
    constructor(public gwtInterface:GwtInterfaceService) {
        this.gwtInterface.addListenerOfGwtEvents(this);
        this.isRunningInFrame = gwtInterface.isRunningInFrame();
        return;
    }

    onGwtEvent(command:string, message:any) : void {
        alert('CollectionsComponent received event from GWT: command('+command+') message('+JSON.stringify(message)+')');
    }

    sendContentDetailEvent() {
        if (this.isRunningInFrame) {
            this.gwtInterface.sendEventContentDetail(null, null);
        } else {
            alert("NOT WORKING - make sure demo runs in edu-sharing GWT");
        }
    }

    sendTestEvent() {
        if (this.isRunningInFrame) {
            this.gwtInterface.sendEventTest();
        } else {
            alert("NOT WORKING - make sure demo runs in edu-sharing GWT");
        }

    }

    ngOnInit() {
    }

}