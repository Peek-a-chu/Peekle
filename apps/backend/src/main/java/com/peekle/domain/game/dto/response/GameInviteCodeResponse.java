package com.peekle.domain.game.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName = "of")
public class GameInviteCodeResponse {
    private String inviteCode;
}
