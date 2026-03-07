package com.peekle.domain.user.controller;

import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dev/users")
@RequiredArgsConstructor
public class UserTestController {

    private final UserRepository userRepository;

    @PostMapping
    public User createUser(@RequestParam String nickname) {
        User user = new User(
                "dev_" + System.currentTimeMillis(), // socialId
                "Google", // provider
                nickname);
        return userRepository.save(user);
    }
}
