import { Component, OnInit, Input} from '@angular/core';
import { MD_CARD_DIRECTIVES } from '@angular2-material/card';
import { MD_BUTTON_DIRECTIVES } from '@angular2-material/button';

import {TranslateService, TranslatePipe} from 'ng2-translate/ng2-translate';

import * as EduData from '.././edu-api.data';

@Component({
  selector: 'edu-card',
  templateUrl: 'app/edu-card/edu-card.component.html',
  styleUrls: ['app/edu-card/edu-card.component.css'],
  directives: [MD_CARD_DIRECTIVES, MD_BUTTON_DIRECTIVES ],
  pipes: [TranslatePipe]
})
export class EduCardComponent implements OnInit {

  // possible input - one must be given
  @Input() node:EduData.Node;
  @Input() reference:EduData.CollectionReference;
  @Input() collection:EduData.Collection;

  private isCollectionReference:boolean = false;
  private isCollection:boolean = false;
  private isContent:boolean = false;
  private isFolder:boolean = false;
  private isNewCollectionPlaceholder:boolean = false; 

  constructor(private translationService:TranslateService) {}

  // break name string if to long
  breakName(name:string):string {
    var maxCharsPerLine:number = 18;
    if (name.length<=maxCharsPerLine) return name;
    if ((name.indexOf(' ')>0) && (name.indexOf(' ')<=maxCharsPerLine)) return name;
    return name.substr(0,maxCharsPerLine) + " " + name.substr(maxCharsPerLine);
  }

  ngOnInit() {

    // if collection reference is input - use original as node
    if (this.reference!=null) {
      this.isCollectionReference = true;
      this.node = this.reference.reference;
    }

    // check input data and decide to be a collection, content or a folder
    if (this.collection!=null) {
      // its a collection
      if (this.collection.ref!=null) {
          this.isCollection = true;

          // default values for collection
          if ((typeof this.collection.color == "undefined") || (this.collection.color==null)) this.collection.color = "#759CB7";

      } else {
        this.isNewCollectionPlaceholder = true;
      }
    } else  
    if (this.node!=null) {

      if (this.node.isContentItem()) {
          // its content
          this.isContent = true;
      } else
      if (this.node.isFolder()) {
          // its a folder
          this.isFolder = true;
      } else {
        console.warn("EduCard: not supported node data type");
      }
    } else {
      console.warn('EduCard: has no input data');
    }

  }

}
