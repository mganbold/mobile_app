import { Injectable } from "@angular/core";
import { Effect, Actions } from "@ngrx/effects";

import { AuthProvider } from "../../providers/auth";
import { TRIGGER_PREP_FOR_LOGOUT, LogoutUser, TRIGGER_USER_CHECK } from "../actions";

@Injectable()
export class UserEffects {

  @Effect({ dispatch: false })
  public logoutUser$ = this._actions$
    .ofType(TRIGGER_PREP_FOR_LOGOUT)
    .map(() => {
      return this._auth.logOutUser();
    });

  constructor(
    private readonly _actions$: Actions,
    private readonly _auth: AuthProvider
  ) { }
}
