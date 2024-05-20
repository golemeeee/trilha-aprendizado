checkSpeed(70);

function checkSpeed(speed){
    const speedLimit = 70
    const kmPerPoint = 5;

    if (speed < speedLimit+kmPerPoint){
        console.log('ok');
        return;
    }
    else{
        let points = Math.floor((speed - speedLimit) / kmPerPoint);
        if (points >= 12)
            console.log('License suspended');
        else
            console.log('Points', points);
    }
}