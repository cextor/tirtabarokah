<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

$routes->group('api', function($routes) {
    // Auth API
    $routes->post('auth/login', 'ApiController::login');
    $routes->post('auth/logout', 'ApiController::logout');
    $routes->post('auth/parent-login', 'ApiController::parentLogin');

    // Coaches API
    $routes->get('coaches', 'ApiController::getCoaches');
    $routes->post('coaches/add', 'ApiController::addCoach');
    $routes->post('coaches/update', 'ApiController::updateCoach');
    $routes->delete('coaches/delete/(:segment)', 'ApiController::deleteCoach/$1');

    // Members API
    $routes->get('members', 'ApiController::getMembers');
    $routes->post('members/register', 'ApiController::registerMember');
    $routes->post('members/verify-payment', 'ApiController::verifyPayment');
    $routes->post('members/update', 'ApiController::updateMember');
    $routes->delete('members/delete/(:segment)', 'ApiController::deleteMember/$1');

    // Events API
    $routes->get('events', 'ApiController::getEvents');
    $routes->post('events/add', 'ApiController::addEvent');
    $routes->post('events/update', 'ApiController::updateEvent');
    $routes->delete('events/delete/(:segment)', 'ApiController::deleteEvent/$1');

    // Progress API
    $routes->post('progress/add', 'ApiController::addProgress');
    $routes->post('progress/quick', 'ApiController::quickAttendance');

    // Reschedule API
    $routes->post('reschedule/request', 'ApiController::requestReschedule');

    // Settings API
    $routes->get('settings', 'ApiController::getSettings');
    $routes->post('settings', 'ApiController::updateSettings');

    // Program Levels API
    $routes->get('levels', 'ApiController::getLevels');
    $routes->post('levels/add', 'ApiController::addLevel');
    $routes->post('levels/update', 'ApiController::updateLevel');
    $routes->delete('levels/delete/(:segment)', 'ApiController::deleteLevel/$1');
});
