import { Injectable } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth'; //Add FirebaseApp
import { User } from '../interfaces';
import { Observable } from "rxjs/Observable";

@Injectable()
export class AuthProvider {
  constructor(
      private _af: AngularFireAuth
  ) { }

  public loginWithEmail(user: User) {
    return Observable.create(observer => {
        this._af.auth.signInWithEmailAndPassword(user.email, user.password).then((authData) => {
          observer.next(authData);
        }).catch((error) => {
          observer.error(error);
        });
    });
  }

  public registerUser(user: User) {
    return Observable.create(observer => {
      this._af.auth.createUserWithEmailAndPassword(user.email, user.password).then(authData => {
        observer.next(authData);
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  public resetPassword(emailAddr: string) {
    return Observable.create(observer => {
      this._af.auth.sendPasswordResetEmail(emailAddr).then(success => {
          observer.next(success);
        }, error => {
          observer.error(error);
        });
     });
  }
}