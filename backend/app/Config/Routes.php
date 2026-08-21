<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');
$routes->post('login', 'Home::login');
$routes->get('logout', 'Home::logout');

$routes->group('api', function($routes) {
    // Auth API
    $routes->post('auth/login', 'ApiController::login');
    $routes->post('auth/logout', 'ApiController::logout');
    $routes->post('auth/parent-login', 'ApiController::parentLogin');
    $routes->post('auth/change-password', 'ApiController::changePassword');

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

    // Pricing Packages API
    $routes->get('pricing-packages', 'ApiController::getPricingPackages');
    $routes->post('pricing-packages/add', 'ApiController::addPricingPackage');
    $routes->post('pricing-packages/update', 'ApiController::updatePricingPackage');
    $routes->delete('pricing-packages/delete/(:segment)', 'ApiController::deletePricingPackage/$1');

    // Audit Logs API
    $routes->get('audit-logs', 'ApiController::getAuditLogs');

    // Program Levels API
    $routes->get('levels', 'ApiController::getLevels');
    $routes->post('levels/add', 'ApiController::addLevel');
    $routes->post('levels/update', 'ApiController::updateLevel');
    $routes->delete('levels/delete/(:segment)', 'ApiController::deleteLevel/$1');

    // Coach Absences API
    $routes->get('absences', 'ApiController::getCoachAbsences');
    $routes->post('absences/report', 'ApiController::reportCoachAbsence');
    $routes->post('absences/process', 'ApiController::processCoachAbsence');

    // Event Categories API
    $routes->get('event-categories', 'ApiController::getEventCategories');
    $routes->post('event-categories/add', 'ApiController::addEventCategory');
    $routes->post('event-categories/update', 'ApiController::updateEventCategory');
    $routes->delete('event-categories/delete/(:segment)', 'ApiController::deleteEventCategory/$1');

    // Swimming Pools API
    $routes->get('swimming-pools', 'ApiController::getSwimmingPools');
    $routes->post('swimming-pools/add', 'ApiController::addSwimmingPool');
    $routes->post('swimming-pools/update', 'ApiController::updateSwimmingPool');
    $routes->delete('swimming-pools/delete/(:segment)', 'ApiController::deleteSwimmingPool/$1');

    // Schedules (Penjadwalan) API
    $routes->get('schedules', 'ApiController::getSchedules');
    $routes->post('schedules/add', 'ApiController::addSchedule');
    $routes->post('schedules/update', 'ApiController::updateSchedule');
    $routes->delete('schedules/delete/(:segment)', 'ApiController::deleteSchedule/$1');

    // Debug API
    $routes->post('debug/log', 'ApiController::debugLog');
});
