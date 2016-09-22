import { Component, OnInit, provide } from '@angular/core';
provide(Window, { useValue: window }); // will not work beyond rc3: https://stackoverflow.com/questions/34177221/angular2-how-to-inject-window-into-an-angular2-service
import { MD_BUTTON_DIRECTIVES } from '@angular2-material/button';
import { MD_INPUT_DIRECTIVES } from '@angular2-material/input';
import { ROUTER_DIRECTIVES, Router, ActivatedRoute } from '@angular/router';
import {TranslateService, TranslatePipe} from 'ng2-translate/ng2-translate';

import {GwtInterfaceService, GwtEventListener} from '.././gwt-interface.service';

import {EduApiService} from '.././edu-api.service';
import * as EduData from '.././edu-api.data';

import {EduCardComponent} from '.././edu-card/edu-card.component';
import {ContentDetailComponent} from '.././content-detail/content-detail.component';

// data class for breadcrumbs
export class Breadcrumb {
    ref:EduData.Reference;
    name:string;
}

// component class
@Component({
  selector: 'app-collections',
  templateUrl: 'app/+collections/collections.component.html',
  styleUrls: ['app/+collections/collections.component.css'],
  directives: [
      EduCardComponent,
      ContentDetailComponent, 
      MD_BUTTON_DIRECTIVES, 
      MD_INPUT_DIRECTIVES
      ],
  providers: [GwtInterfaceService, {provide: Window, useValue: window}],
  pipes: [TranslatePipe],
})
export class CollectionsComponent implements OnInit, GwtEventListener {

    public static SCOPE_NOSCOPE:number = -1;
    public static SCOPE_MYCOLLECTIONS:number = 0;
    public static SCOPE_MYORGANIZATIONS:number = 1;
    public static SCOPE_ALLCOLLECTIONS:number = 2; 

    private tabSelected:number = CollectionsComponent.SCOPE_MYCOLLECTIONS;
    private isLoading:boolean = false;
    private isReady:boolean = false;
    private clearSearchOnNextStateChange:boolean = false;

    private showLehrplanAnalysisButton:boolean = false;
    private showLehrplanAnalyse:boolean = false;
    
    private collectionContent:EduData.CollectionContent;
    private filteredOutCollections:Array<EduData.Collection> = new Array<EduData.Collection>();
    private filteredOutReferences:Array<EduData.CollectionReference> = new Array<EduData.CollectionReference>();
    private collectionIdParamSubscription:any;
    private lastError:string = null;
    private ownProfile:EduData.PersonalProfile = null;

    // if set (not null) this content will be displayed in detail
    private contentDetailObject:EduData.CollectionReference = null;

    private breadcrumbs:Array<Breadcrumb> = new Array<Breadcrumb>();

    // real parentCollectionId is only available, if user was browsing
    private parentCollectionId:EduData.Reference = new EduData.Reference("-home-","-root-");

    private temp:string;
    private lastScrollY:number;

    // inject services
    constructor(
        public gwtInterface:GwtInterfaceService,
        public eduApiService:EduApiService,
        private route:ActivatedRoute,
        private router: Router,
        private translationService:TranslateService) {
            this.collectionContent = new EduData.CollectionContent();
            this.collectionContent.setCollectionID("-root-");
            this.gwtInterface.addListenerOfGwtEvents(this);
    }
    
    selectTabMyCollections():void {
        if ((this.tabSelected!=CollectionsComponent.SCOPE_MYCOLLECTIONS) 
            || (this.collectionContent.getCollectionID()!="-root-")) {
            this.tabSelected = CollectionsComponent.SCOPE_MYCOLLECTIONS;
            this.collectionContent = new EduData.CollectionContent();
            this.collectionContent.setCollectionID('-root-');
            this.breadcrumbs = new Array<Breadcrumb>();
            this.parentCollectionId = new EduData.Reference("-home-","-root-");
            this.contentDetailObject = null;
            this.refreshContent();
        }
    }
    
    selectTabMyOrganizations():void {
        if ((this.tabSelected!=CollectionsComponent.SCOPE_MYORGANIZATIONS)
            || (this.collectionContent.getCollectionID()!="-root-")) {
            this.tabSelected = CollectionsComponent.SCOPE_MYORGANIZATIONS;
            this.collectionContent = new EduData.CollectionContent();
            this.collectionContent.setCollectionID('-root-');
            this.breadcrumbs = new Array<Breadcrumb>();
            this.parentCollectionId = new EduData.Reference("-home-","-root-");
            this.contentDetailObject = null;
            this.refreshContent();
        }
    }
    
    selectTabAllCollections():void {
        if ((this.tabSelected!=CollectionsComponent.SCOPE_ALLCOLLECTIONS)
            || (this.collectionContent.getCollectionID()!="-root-")) {
            this.tabSelected = CollectionsComponent.SCOPE_ALLCOLLECTIONS;
            this.collectionContent = new EduData.CollectionContent();
            this.collectionContent.setCollectionID('-root-');
            this.breadcrumbs = new Array<Breadcrumb>();
            this.parentCollectionId = new EduData.Reference("-home-","-root-");
            this.contentDetailObject = null;
            this.refreshContent();
        }
    }

    selectBreadcrumb(crumb:Breadcrumb, doNavigation:boolean=true) : void {

        // make sure no content is n detail
        this.contentDetailObject = null;

        // cut breadcrumbs
        let valid:boolean = true;
        let cutCrumbs = Array<Breadcrumb>();
        this.breadcrumbs.forEach(oldCrumb => {
            if (oldCrumb.ref.id==crumb.ref.id) valid=false;
            if (valid) cutCrumbs.push(oldCrumb);
        });
        this.breadcrumbs = cutCrumbs;

        // set parent collection based in bread crumb
        if (this.breadcrumbs.length>0) {
            this.parentCollectionId = this.breadcrumbs[(this.breadcrumbs.length-1)].ref;
        } else {
            this.parentCollectionId = new EduData.Reference("-home-","-root-");
        }

        // set thru router so that browser back button can work
        if (doNavigation) this.router.navigate(['/collections',{id: crumb.ref.id, t:(new Date()).getTime()}]);

    }

    // sorting collections and references
    sortCollectionContent() : void {
        this.collectionContent.collections = this.collectionContent.collections.sort(
            function(a:EduData.Collection,b:EduData.Collection):number {
                // first sort by number of sub collections
                if (a.childCollectionsCount!=b.childCollectionsCount) return  b.childCollectionsCount-a.childCollectionsCount;
                // second sort by number of references
                if (a.childReferencesCount!=b.childReferencesCount) return  b.childReferencesCount-a.childReferencesCount;
                // third sort by date of creation
                return 0;
            }
        );
    }

    // just show content (collections & references) that
    // match the keyword in title ot description
    filterCollectionContent(keyword:string):void {

       // put back all previous filtered out
       
       this.collectionContent.references = this.collectionContent.references.concat(this.filteredOutReferences);
       this.collectionContent.collections = this.collectionContent.collections.concat(this.filteredOutCollections);
       this.filteredOutReferences = new Array<EduData.CollectionReference>();
       this.filteredOutCollections = new Array<EduData.Collection>();

       // filter collections
       var filteredInCollections:Array<EduData.Collection> = new Array<EduData.Collection>();
       this.collectionContent.collections.forEach((collection) => {
           var isMatch:boolean = false;
           if ((typeof collection.title != "undefined") && (collection.title.toLowerCase().indexOf(keyword.toLowerCase())>=0)) isMatch = true;
           if ((typeof collection.description != "undefined") && (collection.description.toLowerCase().indexOf(keyword.toLowerCase())>=0)) isMatch = true;
           if (isMatch) {
               filteredInCollections.push(collection);
           } else {
               this.filteredOutCollections.push(collection);       
           }
       });
       this.collectionContent.collections = filteredInCollections;

       // filter references
       var filteredInReferences:Array<EduData.CollectionReference> = new Array<EduData.CollectionReference>();
       this.collectionContent.references.forEach((reference) => {
           var isMatch:boolean = false;
           if ((typeof reference.reference.title != "undefined") && (reference.reference.title.toLowerCase().indexOf(keyword.toLowerCase())>=0)) isMatch = true;
           if ((typeof reference.reference.description != "undefined") && (reference.reference.description.toLowerCase().indexOf(keyword.toLowerCase())>=0)) isMatch = true;
           if (isMatch) {
               filteredInReferences.push(reference);
           } else {
               this.filteredOutReferences.push(reference);       
           }
       });
       this.collectionContent.references = filteredInReferences;

       this.sortCollectionContent();
    }

    isRootLevelCollection():boolean {
        if (this.collectionContent==null) return false;
        return this.collectionContent.getCollectionID()=='-root-';
    }

    isAllowedToEditCollection() : boolean {
        if ((this.isRootLevelCollection()) && (this.tabSelected!=CollectionsComponent.SCOPE_MYCOLLECTIONS)) return false;
        if (this.collectionContent.collection.hasAccessPermission('Delete')) return true;
        return false;
    }

    isAllowedToDeleteCollection() : boolean {
        if (this.isRootLevelCollection()) return false;
        if (this.collectionContent.collection.hasAccessPermission('Delete')) return true;
        return false;
    }

    switchToSearch() : void {
        console.log("gwtInterface: trying to send signal to GWT for changing to search view");
        this.gwtInterface.sendEventSwitchToSearchView();
    }

    switchToGlamSearch() : void {
        this.router.navigate(['/searchcollect/'+this.collectionContent.collection.ref.id]);
    }

    buttonCollectionDelete() : void {
        // TODO: do dialog like on http://confluence.edu-sharing.net/confluence/pages/viewpage.action?pageId=1868501
        this.translationService.get('collections_confirmDelete').subscribe((res: string) => {
            if (!confirm(res)) {
                return;
            }
            this.isLoading = true;
            this.eduApiService.deleteCollection(this.collectionContent.collection.ref.id, this.collectionContent.collection.ref.repo).subscribe( result => {
                this.isLoading = false;
                this.router.navigate(['/collections',{id: this.parentCollectionId.id, t:(new Date()).getTime()}]);
                return;
            }, error => {
                // TODO: change alert to dialog
                this.isLoading = false;
                alert("Sorry. Was not able to delete the collection: "+JSON.stringify(error));
            });
        });
    }

    buttonCollectionEdit() : void {
        this.router.navigate(['/collection/edit/'+this.collectionContent.collection.ref.id]);
        return;
    }

    // gets called by user if something went wrong to start fresh from beginning
    resetCollections() : void {
        var url = window.location.href;
        url = url.substring(0,url.indexOf("collections")+11);
        window.location.href = url;
        return;
    }
    
    refreshContent() : void {

        this.isLoading=true;

        // clear search field in GWT top area
        if (this.clearSearchOnNextStateChange) {
            this.clearSearchOnNextStateChange=false;
            this.gwtInterface.sendEvent("clearsearch", null);
        }
        
        // set correct scope
        let scope = -1;
        if (this.tabSelected==CollectionsComponent.SCOPE_NOSCOPE) scope = EduData.GETCOLLECTIONS_SCOPE.ALL;
        if (this.tabSelected==CollectionsComponent.SCOPE_MYCOLLECTIONS) scope = EduData.GETCOLLECTIONS_SCOPE.MY;
        if (this.tabSelected==CollectionsComponent.SCOPE_MYORGANIZATIONS) scope = EduData.GETCOLLECTIONS_SCOPE.GROUPS;
        if (this.tabSelected==CollectionsComponent.SCOPE_ALLCOLLECTIONS) scope = EduData.GETCOLLECTIONS_SCOPE.ALL;

        // load childs of actual set collection
        this.eduApiService.getCollectionContent(scope, this.collectionContent.getCollectionID()).subscribe( collection => {
            this.lastError = null;

            // transfere sub collections and content
            this.collectionContent.collections = collection.collections;
            this.collectionContent.references = collection.references;
            
            // add an empty collection for the "add new colleciton" card
            if (this.isAllowedToEditCollection()) this.collectionContent.collections.unshift(new EduData.Collection());
            
            // check if lehrplan root 
            this.showLehrplanAnalysisButton = (this.collectionContent.collection.title!=null) && (this.collectionContent.collection.title.indexOf('Lehrplan')>=0);

            // fire for every collection content a request for permission
            if (this.collectionContent.collections!=null) {
                this.collectionContent.collections.forEach( coll=> {
                    if ((coll.ref!=null) && (coll.permission==null)) this.eduApiService.getPermissions(coll.ref.id, coll.ref.repo).subscribe( permission => {
                        coll.permission = permission;
                    });
                });
            }

            this.sortCollectionContent();
            this.isLoading=false;
        }, error => {
            this.lastError = "Error on getting Collections: "+JSON.stringify(error);
            this.isLoading=false;
        } );

        if ((this.collectionContent.getCollectionID()!="-root-") && (this.collectionContent.collection.permission==null)) {
            this.eduApiService.getPermissions(this.collectionContent.getCollectionID()).subscribe( permission => {
                this.collectionContent.collection.permission = permission;
            });
        }
       
    }

    onCollectionsClick(collection:EduData.Collection) : void {

        // check if click was on new collections placeholder
        if (collection.ref==null) {
            this.router.navigate(['/collection/new/'+this.collectionContent.collection.ref.id]);
            return;
        }

        // remember actual collection as breadcrumb
        if (!this.isRootLevelCollection()) {
            let crumb = new Breadcrumb();
            crumb.ref = this.collectionContent.collection.ref;
            crumb.name =this.collectionContent.collection.title;
            this.parentCollectionId = crumb.ref;
            this.breadcrumbs.push(crumb);
        }

        // set thru router so that browser back button can work
        this.router.navigate(['/collections',{id: collection.ref.id, t:(new Date()).getTime()}]);

    }

    onContentClick(content:EduData.CollectionReference) : void {

        if (content.originalId==null) {
            if (this.isAllowedToDeleteCollection()) {
                this.translationService.get('collections_originalMissingDelete').subscribe((res: string) => {
                    if(confirm(res)) {
                        this.isLoading = true;
                        this.eduApiService.removeFromCollection(content.ref.id, this.collectionContent.collection.ref.id).subscribe((result) => {
                            // WIN
                            this.isLoading = false;
                            this.refreshContent();
                        }, error => {
                            // FAIL
                            this.isLoading = false;
                            alert("ERROR was not able to remove reference.");
                        });
                    }
                });
            } else {
                this.translationService.get('collections_originalMissing').subscribe((res: string) => {
                    alert(res);
                });
            }
            return;
        }

        // remember the scroll Y before displaying content
        this.lastScrollY = window.scrollY;

        // set content for being displayed in detail
        this.contentDetailObject = content;

        // add breadcrumb            
        let crumb = new Breadcrumb();
        crumb.ref = this.collectionContent.collection.ref;
        crumb.name =this.collectionContent.collection.title;
        this.parentCollectionId = crumb.ref;
        this.breadcrumbs.push(crumb);

        return;
    }

    contentDetailBack() : void {

        // remove content from dispay focus
        this.contentDetailObject = null;

        // remove latest breadcrumb
        this.breadcrumbs.pop();

        // scroll to last Y
        window.scrollTo(0,this.lastScrollY);
    }

    onGwtEvent(command:string, message:any) : void {

        if (command=='collections:filter') {
            this.filterCollectionContent(message);
            this.clearSearchOnNextStateChange = true;
        }

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
            // everything is ready --> do final init stuff
            this.ngOnInitFinal();      
        }

        // make sure the top area search field is clean
        this.gwtInterface.sendEvent("clearsearch", null);

    }

    showLehrplanAnalysis() : void {

        this.isLoading = true;
        this.eduApiService.analyseCollection(this.collectionContent.collection.ref.id).subscribe( result => {
            // WIN
            this.isLoading=false;
            this.showLehrplanAnalyse = ! this.showLehrplanAnalyse;
            window['lehrplanAnalyseData'] = result;

        }, error => {
            // FAIL 
            this.isLoading=false;
            console.dir("Was not able to process statistic.");
        });

    }

    displayCollectionById(id:string) : void {
            if (id==null) id="-root-";
            if (id=="-root-") {
                // display root collections with tabs
                this.collectionContent = new EduData.CollectionContent();
                this.collectionContent.setCollectionID("-root-");
                this.refreshContent();
            } else {
               // load metadata of collection
               this.isLoading=true;
               this.eduApiService.getCollectionMetadata(id).subscribe( collection => {

                    // set breadcrumb
                    var crumb:Breadcrumb = new Breadcrumb();
                    crumb.name = collection.title;
                    crumb.ref = collection.ref;
                    this.selectBreadcrumb(crumb, false);

                    // set the collection and load content data by refresh
                    this.collectionContent = new EduData.CollectionContent();
                    this.collectionContent.collection = collection;
                    this.refreshContent(); 
               
               }, error => {
                    this.isLoading=false;
                    this.lastError = "Was not able to load collection with id: "+id;
               });
            }
    }
    
    ngOnInitFinal() {

        // load user profile
        this.eduApiService.getOwnProfile().subscribe( personalprofile => {
            // WIN   
            
            // remember own profile
            this.ownProfile = personalprofile;

            // set app to ready state
            this.gwtInterface.addListenerOfGwtEvents(this);
            this.selectTabMyCollections();
            this.isReady = true;

            // subscribe to parameters of url
            this.collectionIdParamSubscription = this.route.params.subscribe(params => {

                // get id from route and validate input data
                let id = params['id'];
                if (typeof id == "undefined") id = "-root-";
                if (id=="") id = "-root-";

                this.displayCollectionById(id);

            });
        
        }, error => {
            // FAIL
            this.lastError = "Was not able to loafd own user profile: "+JSON.stringify(error);
            this.isReady = true;
        });

    }

}