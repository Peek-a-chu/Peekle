package com.peekle.domain.auth.service;

import com.peekle.domain.auth.dto.SignupRequest;
import com.peekle.domain.league.service.LeagueService;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {
    private final UserRepository userRepository;
    private final LeagueService leagueService;

    public boolean existsBySocialIdAndProvider(String socialId, String provider) {
        return userRepository.findBySocialIdAndProvider(socialId, provider).isPresent();
    }

    public boolean existsByNickname(String nickname) {
        return userRepository.findByNickname(nickname).isPresent();
    }

    @Transactional
    public User signup(String socialId, String provider, SignupRequest request) {
        User user = new User(socialId, provider, request.nickname());
        if (request.bojId() != null && !request.bojId().isBlank()) {
            user.registerBojId(request.bojId());
        }
        userRepository.save(user);
        leagueService.assignInitialLeague(user);
        return user;
    }
}
