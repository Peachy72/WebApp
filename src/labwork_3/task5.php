<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task 5</title>
</head>
<body>
    <?php
        function isPrime($number) {
            if ($number < 2) {
                return false;
            }
            for ($i = 2; $i <= sqrt($number); $i++) {
                if ($number % $i == 0) {
                    return false;
                }
            }
            return true;
        }

        // Example:
        echo "Is 7 prime? " . (isPrime(7) ? "Yes" : "No") . "<br>";
        echo "Is 8 prime? " . (isPrime(8) ? "Yes" : "No") . "<br>";
    ?>
</body>
</html>