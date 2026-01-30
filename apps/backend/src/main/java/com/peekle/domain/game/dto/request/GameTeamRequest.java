package com.peekle.domain.game.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GameTeamRequest extends GameCommonRequest{
    private String team; // RED / BLUE
}
