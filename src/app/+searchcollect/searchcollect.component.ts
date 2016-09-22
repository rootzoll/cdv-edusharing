import { Component, OnInit } from '@angular/core';
import {GwtInterfaceService, GwtEventListener} from '.././gwt-interface.service';
import { MD_BUTTON_DIRECTIVES } from '@angular2-material/button';
import { MD_INPUT_DIRECTIVES } from '@angular2-material/input';
import { ROUTER_DIRECTIVES, Router, ActivatedRoute } from '@angular/router';
import { EduCardComponent } from '.././edu-card/edu-card.component';

import {EduApiService} from '.././edu-api.service';
import * as EduData from '.././edu-api.data';

@Component({
    selector: 'app-searchcollect',
    templateUrl: 'app/+searchcollect/searchcollect.component.html',
    styleUrls: ['app/+searchcollect/searchcollect.component.css'],
    providers: [GwtInterfaceService],
      directives: [
      EduCardComponent,
      MD_BUTTON_DIRECTIVES, 
      MD_INPUT_DIRECTIVES
      ],
})
export class SearchcollectComponent implements OnInit {

    isRunningInFrame:boolean;
    collectionId:string;
    userSearchTerm:string;
    
    isReady:boolean = false;
    isLoading:boolean = false;

    resultNodes:Array<EduData.Node> = new Array<EduData.Node>();

    collection:EduData.Collection = new EduData.Collection();

    // inject services
    constructor(
        public gwtInterface:GwtInterfaceService,
        private route:ActivatedRoute,
        private router: Router,
        public eduApiService:EduApiService
        ) {
        this.gwtInterface.addListenerOfGwtEvents(this);
        this.isRunningInFrame = gwtInterface.isRunningInFrame();
        return;
    }

    onGwtEvent(command:string, message:any) : void {
    }

    ngOnInitFinal() {

        this.route.params.subscribe(params => {

                // get id from route and validate input data
                let id = params['id'];
                if (typeof id == "undefined") id = "-root-";
                if (id=="") id = "-root-";
                this.collectionId = id;

                // load collection
                this.isReady = false;
                this.eduApiService.getCollectionMetadata(this.collectionId).subscribe( data => {
                    // WIN
                    this.collection = data;
                    this.isReady = true;
                }, error => {
                    // FAIL
                    alert("Was not able to load collection ... trying to go back.");
                    this.backToCollection;
                });

            });

    }

    ngOnInit() {

        // if running not in GWT context and is eduAPI is not ready --> auto login for dev with admin/admin
        if ( (!this.gwtInterface.isRunningInFrame()) && (!this.eduApiService.setUpIsWorking())) {
            this.eduApiService.oAuthInitWithUsernameAndPasswordFlow("admin","admin").subscribe(
                isWorking => {
                if (isWorking) {
                    // now everything is ready --> do final init stuff
                    this.ngOnInitFinal();   
                } else {
                    alert("SORRY, DEV AUTOLOGIN FAILED - API IS NOT READY!");
                }
            });
        } else {
            this.ngOnInitFinal();
        }

    }

    backToCollection() {
        this.router.navigate(['/collections',{id: this.collectionId, t:(new Date()).getTime()}]);
    }

    jsonStrResults() {
        if (this.resultNodes==null) return "NULL";
        return JSON.stringify(this.resultNodes);
    } 

    onContentClick(node:any):void {
        alert("CLICK");
        //alert("id("+node.ref.id+")");
    }

    doSearch() {

        if (this.userSearchTerm.length==0) {
            alert("Please enter search term");
            return;
        }

        this.isLoading = true;
        this.eduApiService.search(this.userSearchTerm).subscribe( result => {
            // WIN
            this.isLoading = false;
            
            this.resultNodes = result;

        }, error => {
            // FAIL
            this.isLoading = false;
            alert("FAIL Search");
        });
    }

}